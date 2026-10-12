/* Attestation business logic: state access, status derivation, workflow simulation,
   campaign launch, owner actions, policy versioning, reviews and metrics.
   In production these responsibilities sit in SharePoint lists, Power Automate flows and Entra ID. */
(function () {
  'use strict';
  const WA = window.WA;
  const { addDays, diffDays, isoDate, pct, fingerprint, initialsOf } = WA;

  let db = null;
  const idx = { emp: new Map(), pol: new Map(), camp: new Map(), dept: new Map(), byEmp: new Map(), byCamp: new Map(), byPol: new Map() };
  const CLOSED = new Set(['Acknowledged', 'Exempted', 'Non-compliant', 'Withdrawn']);
  const PERMS = {
    employee: ['library', 'attest'],
    owner: ['library', 'attest', 'manage', 'reports', 'audit', 'export'],
    manager: ['library', 'attest', 'team'],
    auditor: ['library', 'audit', 'reports', 'export'],
  };
  const PERSONA_IDS = () => Object.values(WA.data.PERSONAS).map((p) => p.userId);

  /* ---------- lifecycle ---------- */
  function init() {
    db = WA.storage.load();
    const fresh = !db;
    if (fresh) db = WA.data.build();
    reindex();
    if (fresh) WA.storage.save(db);
    return fresh;
  }
  function reindex() {
    Object.values(idx).forEach((m) => m.clear());
    db.employees.forEach((e) => idx.emp.set(e.id, e));
    db.policies.forEach((p) => idx.pol.set(p.id, p));
    db.campaigns.forEach((c) => idx.camp.set(c.id, c));
    db.departments.forEach((d) => idx.dept.set(d.id, d));
    db.assignments.forEach(indexAssignment);
  }
  function indexAssignment(a) {
    [[idx.byEmp, a.employeeId], [idx.byCamp, a.campaignId], [idx.byPol, a.policyId]].forEach(([m, k]) => {
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(a);
    });
  }
  const persistNow = () => WA.storage.save(db);
  const persist = WA.debounce(persistNow, 120);
  function resetAll() {
    WA.storage.clear();
    db = WA.data.build();
    reindex();
    persistNow();
  }

  /* ---------- lookups ---------- */
  const state = () => db;
  const today = () => db.today;
  const settings = () => db.settings;
  const emp = (id) => idx.emp.get(id);
  const pol = (id) => idx.pol.get(id);
  const camp = (id) => idx.camp.get(id);
  const dept = (id) => idx.dept.get(id);
  const deptName = (id) => (dept(id) || {}).name || id;
  const teamName = (id) => (dept(id) || {}).team || deptName(id);
  const empName = (id) => (id === 'SYSTEM' ? 'Power Automate (simulated)' : (emp(id) || {}).name || id || '—');
  const asgFor = (empId) => idx.byEmp.get(empId) || [];
  const asgByCamp = (cid) => idx.byCamp.get(cid) || [];
  const asgByPol = (pid) => idx.byPol.get(pid) || [];
  const asg = (id) => db.assignments.find((a) => a.id === id);
  const activeEmployees = () => db.employees.filter((e) => e.status === 'Active');
  const directReports = (mgrId) => db.employees.filter((e) => e.managerId === mgrId && e.status === 'Active');
  const lineManagerOf = (empId) => emp((emp(empId) || {}).managerId);
  const deptHeadOf = (empId) => {
    const m = lineManagerOf(empId);
    if (m && m.managerId) return emp(m.managerId);
    const e = emp(empId);
    return e ? emp(dept(e.deptId).headId) : null;
  };

  /** Demo clock: fixed demo date combined with the real time of day (so ordering is natural). */
  function demoNow() {
    const now = new Date();
    const h = Math.max(6, now.getUTCHours());
    return `${db.today}T${String(h).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}:${String(now.getUTCSeconds()).padStart(2, '0')}Z`;
  }

  /* ---------- persona / permissions ---------- */
  const persona = () => WA.data.PERSONAS[db.session.persona] || WA.data.PERSONAS.employee;
  const user = () => emp(persona().userId);
  const can = (perm) => (PERMS[persona().key] || []).includes(perm);
  function setPersona(key) {
    if (!WA.data.PERSONAS[key]) return;
    db.session.persona = key;
    persist();
  }

  /* ---------- assignment status & workflow ---------- */
  const isOpen = (a) => !CLOSED.has(a.status);
  const simToday = (a) => addDays(db.today, a.sim || 0);
  const refDate = (a) => (isOpen(a) ? simToday(a) : isoDate(a.ackAt || a.closedAt || simToday(a)));
  function statusOf(a) {
    if (!isOpen(a)) return a.status;
    return simToday(a) > a.due ? 'Overdue' : a.status;
  }
  const daysToDue = (a) => diffDays(a.due, simToday(a));
  function escOffsets() {
    const s = db.settings;
    return s.escalationDays.map((d) => d - s.windowDays);
  }
  function escStage(a) {
    const over = diffDays(refDate(a), a.due);
    const off = escOffsets();
    let st = 0;
    off.forEach((o, i) => { if (over >= o) st = i + 1; });
    return Math.max(st, a.escManual || 0);
  }
  const STAGE_LABEL = ['—', 'Stage 1 — line manager copied', 'Stage 2 — policy owner & overdue register', 'Stage 3 — department head; formal non-compliance'];

  function milestones(a) {
    const s = db.settings;
    const out = [{ date: a.assigned, kind: 'notify', label: 'Notification sent by email and Teams', who: 'Employee' }];
    s.reminderDays.forEach((d, i) => {
      const date = addDays(a.assigned, d);
      if (date < a.due) out.push({ date, kind: 'reminder', label: `Reminder ${i + 1} (day ${d})`, who: 'Employee' });
    });
    out.push({ date: a.due, kind: 'due', label: 'Due date — item becomes overdue if not acknowledged', who: '—' });
    const whoByStage = ['Employee, copied to line manager', 'Policy owner; second notice to line manager', 'Department head and policy owner'];
    const labelByStage = ['Escalation stage 1 — overdue banner shown in the portal', 'Escalation stage 2 — added to the overdue register', 'Escalation stage 3 — formal non-compliance record'];
    escOffsets().forEach((o, i) => out.push({ date: addDays(a.due, o), kind: 'escalation', stage: i + 1, label: labelByStage[i], who: whoByStage[i] }));
    const last = addDays(a.due, escOffsets()[escOffsets().length - 1]);
    for (let w = 1; w <= 4; w++) out.push({ date: addDays(last, w * s.weeklyAfterDays), kind: 'weekly', label: `Weekly reminder ${w} until resolved`, who: 'Employee and line manager' });
    return out;
  }

  function recipientsFor(m, a) {
    const e = emp(a.employeeId);
    const p = pol(a.policyId);
    const mgr = lineManagerOf(a.employeeId);
    const head = deptHeadOf(a.employeeId);
    if (m.kind === 'notify' || m.kind === 'reminder' || m.kind === 'due') return [e];
    if (m.kind === 'weekly') return [e, mgr];
    if (m.stage === 1) return [e, mgr];
    if (m.stage === 2) return [emp(p.ownerId), mgr];
    return [head, emp(p.ownerId)];
  }

  /** Derived + explicit timeline for one attestation record. */
  function timeline(a) {
    const ref = refDate(a);
    const open = isOpen(a);
    const items = [];
    let futureShown = 0;
    milestones(a).forEach((m) => {
      // closed records: show what happened before closure; open records: history plus the next two steps
      const past = open ? m.date <= ref : (m.kind === 'notify' || m.kind === 'reminder') ? m.date <= ref : m.date < ref;
      if (!past && (!open || futureShown >= 2)) return;
      if (!past) futureShown++;
      items.push({ ts: m.date, kind: m.kind, title: m.label, meta: m.who !== '—' ? `To: ${m.who}` : '', future: !past, simulated: past && m.date > db.today, tone: m.kind === 'escalation' ? 'bad' : m.kind === 'reminder' || m.kind === 'weekly' ? 'warn' : m.kind === 'due' ? 'warn' : 'info' });
    });
    if (a.openedAt) items.push({ ts: a.openedAt, kind: 'opened', title: `Policy opened in the reader (v${a.version})`, meta: 'Version and fingerprint logged', tone: 'info' });
    if (a.ackAt) items.push({ ts: a.ackAt, kind: 'ack', title: `Acknowledged — receipt ${a.receipt}`, meta: `Initials ${a.initials || '—'} · ${a.channel || 'Portal'} · server timestamp`, tone: 'good' });
    db.events.filter((ev) => ev.assignmentId === a.id && !/acknowledged|opened/.test(ev.type)).forEach((ev) => {
      items.push({ ts: ev.ts, kind: ev.type, title: ev.detail, meta: `By ${empName(ev.actorId)}`, tone: /exempt|extended|resolved/.test(ev.type) ? 'info' : /noncompliant|escalat/.test(ev.type) ? 'bad' : 'warn', simulated: !!ev.simulated });
    });
    return items.sort((x, y) => (x.ts < y.ts ? -1 : x.ts > y.ts ? 1 : 0));
  }

  /* ---------- events & notifications ---------- */
  function logEvent(type, detail, refs, extra) {
    const e = { id: `EV-${String(db.seq.event++).padStart(6, '0')}`, ts: demoNow(), type, actorId: (user() || {}).id || 'SYSTEM', detail, ...(refs || {}), ...(extra || {}) };
    db.events.push(e);
    return e;
  }
  /** Stores notifications for demo personas only; other recipients are counted in the simulated outbox. */
  function notify(toId, kind, channel, subject, body, link) {
    if (!toId) return;
    db.outbox = db.outbox || { messages: 0 };
    db.outbox.messages++;
    if (!PERSONA_IDS().includes(toId)) return;
    db.notifications.push({ id: `NT-${String(db.seq.notification++).padStart(6, '0')}`, to: toId, ts: demoNow(), kind, channel, subject, body, link: link || null, read: false, simulated: true });
    if (db.notifications.length > 600) db.notifications.splice(0, db.notifications.length - 600);
  }
  const notificationsFor = (uid) => db.notifications.filter((n) => n.to === uid).sort((x, y) => (x.ts < y.ts ? 1 : -1));
  const unreadCount = (uid) => db.notifications.filter((n) => n.to === uid && !n.read).length;
  function markRead(id) { const n = db.notifications.find((x) => x.id === id); if (n) { n.read = true; persist(); } }
  function markAllRead(uid) { db.notifications.forEach((n) => { if (n.to === uid) n.read = true; }); persist(); }

  /* ---------- employee actions ---------- */
  function openForReading(aid) {
    const a = asg(aid);
    if (!a) return null;
    if (a.status === 'Pending') {
      a.status = 'In Progress';
      a.openedAt = demoNow();
      const p = pol(a.policyId);
      logEvent('assignment.opened', `Opened ${p.id} ${p.title} v${a.version} in the policy reader`, { assignmentId: a.id, employeeId: a.employeeId, policyId: a.policyId, campaignId: a.campaignId });
      persist();
    }
    return a;
  }
  function makeReceiptRef() {
    return `ACK-${db.today.replace(/-/g, '')}-${WA.randomId(6)}`;
  }
  function acknowledge(aid, { initials, readSeconds, channel }) {
    const a = asg(aid);
    if (!a || !isOpen(a)) throw new Error('This attestation is no longer open.');
    const e = emp(a.employeeId);
    const expected = initialsOf(e.name);
    if (String(initials || '').trim().toUpperCase() !== expected) throw new Error(`Initials must match the signed-in employee (${expected}).`);
    const late = simToday(a) > a.due;
    a.status = 'Acknowledged';
    a.openedAt = a.openedAt || demoNow();
    a.ackAt = demoNow();
    a.receipt = makeReceiptRef();
    a.initials = expected;
    a.channel = channel || 'Portal';
    a.readSeconds = readSeconds || null;
    a.outcome = late ? 'Acknowledged late' : 'On time';
    const p = pol(a.policyId);
    const v = p.versions.find((x) => x.version === a.version) || {};
    logEvent('assignment.acknowledged', `Acknowledged ${p.id} v${a.version} — receipt ${a.receipt}${late ? ' (late)' : ''}`, { assignmentId: a.id, employeeId: a.employeeId, policyId: a.policyId, campaignId: a.campaignId }, { fingerprint: v.hash || null });
    notify(a.employeeId, 'receipt', 'Email', `Receipt: ${p.title} v${a.version} acknowledged`, `Reference ${a.receipt}. Your acknowledgement has been recorded and locked (simulated).`, `#/receipt/${a.receipt}`);
    persistNow();
    return a;
  }
  const byReceipt = (ref) => db.assignments.find((a) => a.receipt === ref);

  /* ---------- owner actions on assignments ---------- */
  function requireManage() { if (!can('manage')) throw new Error('Your current persona has read-only access.'); }
  function refsOf(a) { return { assignmentId: a.id, employeeId: a.employeeId, policyId: a.policyId, campaignId: a.campaignId }; }

  function sendReminder(aid) {
    requireManage();
    const a = asg(aid);
    const p = pol(a.policyId);
    notify(a.employeeId, 'reminder', 'Email & Teams', `Reminder: please acknowledge ${p.title}`, `Manual reminder from the policy owner (simulated). Due ${WA.fmtDate(a.due)}.`, `#/read/${a.id}`);
    logEvent('assignment.reminder', `Manual reminder sent to ${empName(a.employeeId)} (simulated email and Teams)`, refsOf(a), { simulated: true });
    persist();
  }
  function escalate(aid) {
    requireManage();
    const a = asg(aid);
    const next = Math.min(3, escStage(a) + 1);
    if (next === escStage(a)) throw new Error('Already at the final escalation stage.');
    a.escManual = next;
    const m = { kind: 'escalation', stage: next };
    const to = recipientsFor(m, a).filter(Boolean);
    const p = pol(a.policyId);
    to.forEach((r) => notify(r.id, 'escalation', 'Email & Teams', `Escalation stage ${next}: ${empName(a.employeeId)} — ${p.title}`, `Manually escalated by the policy owner (simulated).`, `#/campaigns/${a.campaignId}`));
    logEvent('assignment.escalated', `Escalated to stage ${next}; notified ${to.map((r) => r.name).join(', ')} (simulated)`, refsOf(a), { simulated: true });
    persist();
  }
  function extend(aid, newDue, reason) {
    requireManage();
    const a = asg(aid);
    if (!newDue || newDue <= a.due) throw new Error('The new due date must be later than the current due date.');
    if (!a.originalDue) a.originalDue = a.due;
    const prev = a.due;
    a.due = newDue;
    a.outcome = 'Extended';
    a.reason = reason;
    a.escManual = 0;
    logEvent('assignment.extended', `Due date extended from ${WA.fmtDate(prev)} to ${WA.fmtDate(newDue)}: ${reason}`, refsOf(a));
    notify(a.employeeId, 'notify', 'Email', `Due date extended: ${pol(a.policyId).title}`, `New due date ${WA.fmtDate(newDue)}. Reason: ${reason}`, `#/read/${a.id}`);
    persist();
  }
  function exempt(aid, reason) {
    requireManage();
    const a = asg(aid);
    a.status = 'Exempted';
    a.outcome = 'Exempted';
    a.reason = reason;
    a.closedAt = demoNow();
    logEvent('assignment.exempted', `Exemption recorded: ${reason}`, refsOf(a));
    persist();
  }
  function nonCompliant(aid, reason) {
    requireManage();
    const a = asg(aid);
    a.status = 'Non-compliant';
    a.outcome = 'Non-compliant';
    a.reason = reason;
    a.closedAt = demoNow();
    const head = deptHeadOf(a.employeeId);
    if (head) notify(head.id, 'escalation', 'Email', `Non-compliance recorded: ${empName(a.employeeId)}`, `${pol(a.policyId).title}. Reason: ${reason}`, '#/team');
    logEvent('assignment.noncompliant', `Non-compliance recorded: ${reason}`, refsOf(a));
    persist();
  }
  function resolveLate(aid, note) {
    requireManage();
    const a = asg(aid);
    if (a.status !== 'Acknowledged' || a.outcome !== 'Acknowledged late') throw new Error('Only late acknowledgements can be closed this way.');
    a.resolvedAt = demoNow();
    a.resolvedBy = user().id;
    a.reason = note || a.reason;
    logEvent('assignment.resolved', `Closed as acknowledged late${note ? ': ' + note : ''}`, refsOf(a));
    persist();
  }
  /** Demo helper: the employee acknowledges (late) so the owner can close the item. */
  function simulateEmployeeAck(aid) {
    requireManage();
    const a = asg(aid);
    const e = emp(a.employeeId);
    const late = simToday(a) > a.due;
    a.status = 'Acknowledged';
    a.openedAt = a.openedAt || demoNow();
    a.ackAt = demoNow();
    a.receipt = makeReceiptRef();
    a.initials = initialsOf(e.name);
    a.channel = 'Teams';
    a.outcome = late ? 'Acknowledged late' : 'On time';
    logEvent('assignment.acknowledged', `Acknowledged by ${e.name} via Teams — receipt ${a.receipt}${late ? ' (late)' : ''} (simulated employee action)`, refsOf(a), { simulated: true });
    persist();
  }
  /** Advance one assignment to its next workflow milestone and send the related (simulated) messages. */
  function simulateStep(aid) {
    requireManage();
    const a = asg(aid);
    if (!isOpen(a)) throw new Error('Closed records cannot be advanced.');
    const cur = simToday(a);
    const next = milestones(a).find((m) => m.date > cur);
    if (!next) throw new Error('No further workflow steps.');
    a.sim = diffDays(next.date, db.today);
    fire(next, a);
    persist();
    return next;
  }
  function fire(m, a) {
    const p = pol(a.policyId);
    const to = recipientsFor(m, a).filter(Boolean);
    const day = diffDays(m.date, a.assigned);
    const kind = m.kind === 'escalation' ? 'escalation' : m.kind === 'notify' ? 'notify' : 'reminder';
    to.forEach((r) => notify(r.id, kind, 'Email & Teams', `${m.kind === 'escalation' ? `Escalation stage ${m.stage}` : m.kind === 'due' ? 'Due today' : 'Reminder'}: ${p.title}${r.id !== a.employeeId ? ' — ' + empName(a.employeeId) : ''}`, `${m.label} (simulated, day ${day}).`, r.id === a.employeeId ? `#/read/${a.id}` : `#/campaigns/${a.campaignId}`));
    logEvent('workflow.simulated', `Simulated day ${day}: ${m.label} → ${to.map((r) => r.name).join(', ') || '—'}`, refsOf(a), { simulated: true });
  }
  /** Advance every open item in a campaign by N days (simulated scheduled flow). */
  function advanceCampaign(cid, days) {
    requireManage();
    const counts = { reminder: 0, escalation: 0, due: 0, weekly: 0, notify: 0 };
    asgByCamp(cid).filter(isOpen).forEach((a) => {
      const before = simToday(a);
      a.sim = (a.sim || 0) + days;
      const after = simToday(a);
      milestones(a).filter((m) => m.date > before && m.date <= after).forEach((m) => {
        counts[m.kind]++;
        const to = recipientsFor(m, a).filter(Boolean);
        to.forEach((r) => notify(r.id, m.kind === 'escalation' ? 'escalation' : 'reminder', 'Email & Teams', `${m.kind === 'escalation' ? 'Escalation stage ' + m.stage : 'Reminder'}: ${pol(a.policyId).title}${r.id !== a.employeeId ? ' — ' + empName(a.employeeId) : ''}`, `${m.label} (simulated).`, r.id === a.employeeId ? `#/read/${a.id}` : `#/campaigns/${cid}`));
      });
    });
    const c = camp(cid);
    logEvent('workflow.run', `Simulated scheduled flow (+${days} days) for "${c.name}": ${counts.reminder + counts.weekly} reminders, ${counts.escalation} escalations, ${counts.due} due-date notices`, { campaignId: cid }, { simulated: true });
    persist();
    return counts;
  }
  function resetSimulation(cid) {
    requireManage();
    asgByCamp(cid).forEach((a) => { a.sim = 0; a.escManual = 0; });
    logEvent('workflow.reset', `Workflow simulation clock reset for "${camp(cid).name}"`, { campaignId: cid }, { simulated: true });
    persist();
  }

  /* ---------- campaigns ---------- */
  function audienceEmployees(aud) {
    const list = activeEmployees();
    if (!aud || aud.type === 'all') return list;
    if (aud.type === 'business') return list.filter((e) => aud.values.includes(e.business));
    if (aud.type === 'department') return list.filter((e) => aud.values.includes(e.deptId));
    if (aud.type === 'named') return list.filter((e) => aud.values.includes(e.id));
    return [];
  }
  function inPolicyAudience(p, e) {
    return !p.audience || p.audience.type === 'all' || (p.audience.values || []).includes(e.deptId);
  }
  function audienceLabel(aud) {
    if (!aud) return '—';
    if (aud.type === 'all') return 'All employees';
    if (aud.type === 'rule') return aud.label;
    if (aud.type === 'business') return 'Business: ' + aud.values.join(', ');
    if (aud.type === 'department') return 'Departments: ' + aud.values.map(deptName).join(', ');
    if (aud.type === 'named') return `${aud.values.length} named employee${aud.values.length === 1 ? '' : 's'}`;
    return '—';
  }
  function previewAssignments(draft) {
    const emps = audienceEmployees(draft.audience);
    let create = 0, skipped = 0, outOfAudience = 0;
    const people = new Set();
    emps.forEach((e) => draft.items.forEach(([pid, ver]) => {
      const p = pol(pid);
      if (draft.respectPolicyAudience && !inPolicyAudience(p, e)) { outOfAudience++; return; }
      const dup = asgFor(e.id).some((a) => a.policyId === pid && a.version === ver && (isOpen(a) || a.status === 'Acknowledged'));
      if (dup) skipped++; else { create++; people.add(e.id); }
    }));
    return { employees: emps.length, people: people.size, create, skipped, outOfAudience };
  }
  function createAssignments(c) {
    const emps = audienceEmployees(c.audience);
    let created = 0, skipped = 0;
    const perEmp = new Map();
    emps.forEach((e) => c.items.forEach(([pid, ver]) => {
      const p = pol(pid);
      if (c.respectPolicyAudience && !inPolicyAudience(p, e)) return;
      const dup = asgFor(e.id).some((a) => a.policyId === pid && a.version === ver && (isOpen(a) || a.status === 'Acknowledged'));
      if (dup) { skipped++; return; }
      const a = {
        id: `ATT-${String(db.seq.assignment++).padStart(6, '0')}`, campaignId: c.id, employeeId: e.id, policyId: pid, version: ver,
        assigned: c.launch, due: c.due, status: 'Pending', openedAt: null, ackAt: null, receipt: null, initials: null, channel: null, readSeconds: null,
        outcome: null, reason: null, escManual: 0, sim: 0, originalDue: null,
      };
      db.assignments.push(a);
      indexAssignment(a);
      created++;
      perEmp.set(e.id, (perEmp.get(e.id) || 0) + 1);
    }));
    perEmp.forEach((n, eid) => notify(eid, 'notify', 'Email & Teams', `Action required: ${n} polic${n === 1 ? 'y' : 'ies'} to acknowledge by ${WA.fmtDate(c.due)}`, `"${c.name}" has been assigned to you. Open the Attestation Centre to read and acknowledge (simulated message).`, '#/attestation'));
    return { created, skipped, people: perEmp.size };
  }
  function launchCampaign(draft) {
    requireManage();
    const id = `CMP-2026-${String(db.seq.campaign++).padStart(3, '0')}`;
    const scheduled = draft.launch > db.today;
    const c = {
      id, name: draft.name, type: draft.type, description: draft.description || '', items: draft.items, audience: draft.audience,
      launch: scheduled ? draft.launch : db.today, due: draft.due, reminders: draft.reminders || db.settings.reminderDays.slice(),
      respectPolicyAudience: !!draft.respectPolicyAudience, status: scheduled ? 'Scheduled' : 'Active', ownerId: user().id, createdAt: demoNow(),
    };
    db.campaigns.push(c);
    idx.camp.set(c.id, c);
    logEvent('campaign.created', `Campaign "${c.name}" created (${c.type})`, { campaignId: c.id });
    let result = { created: 0, skipped: 0, people: 0 };
    if (!scheduled) {
      result = createAssignments(c);
      logEvent('campaign.launched', `Campaign "${c.name}" launched — ${result.created} assignments for ${result.people} employees; ${result.skipped} duplicates skipped; email and Teams notices sent (simulated)`, { campaignId: c.id });
    }
    persistNow();
    return { campaign: c, ...result };
  }
  function launchScheduledNow(cid) {
    requireManage();
    const c = camp(cid);
    if (c.status !== 'Scheduled') throw new Error('Only scheduled campaigns can be launched.');
    const span = diffDays(c.due, c.launch);
    c.launch = db.today;
    c.due = addDays(db.today, span > 0 ? span : db.settings.windowDays);
    c.status = 'Active';
    const r = createAssignments(c);
    logEvent('campaign.launched', `Campaign "${c.name}" launched early — ${r.created} assignments for ${r.people} employees (simulated notices sent)`, { campaignId: c.id });
    persistNow();
    return r;
  }
  function closeCampaign(cid) {
    requireManage();
    const c = camp(cid);
    c.status = 'Closed';
    c.closedAt = db.today;
    logEvent('campaign.closed', `Campaign "${c.name}" closed; open items remain on the overdue register`, { campaignId: c.id });
    persist();
  }

  /* ---------- policies ---------- */
  function nextPolicyId(deptId) {
    const nums = db.policies.filter((p) => p.id.startsWith(deptId + '.')).map((p) => parseInt(p.id.split('.')[1], 10));
    const n = (nums.length ? Math.max(...nums) : 0) + 1;
    return `${deptId}.${String(n).padStart(2, '0')}`;
  }
  function addPolicy(d) {
    requireManage();
    const id = nextPolicyId(d.deptId);
    const p = {
      id, title: d.title, deptId: d.deptId, businesses: d.businesses, ownerId: d.ownerId, approver: d.approver,
      version: '1.0', created: db.today, uploaded: db.today, effective: d.effective || null, review: d.review,
      status: 'Draft', attestation: !!d.attestation, minRead: Number(d.minRead) || 5, regulatory: !!d.regulatory,
      audience: d.audience, versions: [], lastReviewed: db.today,
      draft: { version: '1.0', note: 'Initial version', major: true, regulatory: !!d.regulatory, date: db.today, effective: d.effective || db.today },
    };
    db.policies.push(p);
    idx.pol.set(p.id, p);
    logEvent('policy.created', `${p.id} ${p.title} created as draft v1.0`, { policyId: p.id });
    persist();
    return p;
  }
  function updatePolicy(id, d) {
    requireManage();
    const p = pol(id);
    const changed = [];
    ['title', 'deptId', 'ownerId', 'approver', 'effective', 'review', 'minRead'].forEach((k) => {
      if (d[k] != null && String(p[k]) !== String(d[k])) { changed.push(k); p[k] = k === 'minRead' ? Number(d[k]) : d[k]; }
    });
    if (d.businesses && d.businesses.join() !== p.businesses.join()) { changed.push('businesses'); p.businesses = d.businesses; }
    if (d.attestation != null && !!d.attestation !== p.attestation) { changed.push('attestation'); p.attestation = !!d.attestation; }
    if (d.regulatory != null && !!d.regulatory !== p.regulatory) { changed.push('regulatory'); p.regulatory = !!d.regulatory; }
    if (d.audience && JSON.stringify(d.audience) !== JSON.stringify(p.audience)) { changed.push('audience'); p.audience = d.audience; }
    if (changed.length) logEvent('policy.updated', `${p.id} metadata updated (${changed.join(', ')})`, { policyId: p.id });
    persist();
    return changed;
  }
  function compareVersions(a, b) {
    const [a1, a2] = String(a).split('.').map(Number);
    const [b1, b2] = String(b).split('.').map(Number);
    return a1 - b1 || (a2 || 0) - (b2 || 0);
  }
  function suggestVersion(p, major) {
    const [m, n] = p.version.split('.').map(Number);
    return major ? `${m + 1}.0` : `${m}.${(n || 0) + 1}`;
  }
  function createVersion(id, d) {
    requireManage();
    const p = pol(id);
    if (!/^\d+\.\d+$/.test(d.version)) throw new Error('Use a version number such as 4.1 or 5.0.');
    if (compareVersions(d.version, p.version) <= 0 && p.versions.length) throw new Error(`New version must be higher than the current v${p.version}.`);
    p.draft = { version: d.version, note: d.note, major: !!d.major, regulatory: !!d.regulatory, date: db.today, effective: d.effective || db.today, file: d.file || `${p.id}_v${d.version}.pdf` };
    logEvent('policy.version.drafted', `${p.id} draft v${d.version} uploaded (${d.major ? 'major' : 'minor'}${d.regulatory ? ', regulatory' : ''}): ${d.note}`, { policyId: p.id });
    persist();
    return p.draft;
  }
  function publishPolicy(id) {
    requireManage();
    const p = pol(id);
    let result = { version: p.version, major: false, regulatory: false };
    if (p.draft) {
      const d = p.draft;
      p.versions.push({ version: d.version, date: db.today, note: d.note, major: d.major, hash: fingerprint(p.id + '@' + d.version + '@' + d.note), file: d.file || `${p.id}_v${d.version}.pdf`, publishedBy: user().id });
      p.version = d.version;
      p.uploaded = db.today;
      p.effective = d.effective || db.today;
      result = { version: d.version, major: d.major, regulatory: d.regulatory };
      p.draft = null;
    }
    p.status = 'Published';
    logEvent('policy.published', `${p.id} ${p.title} v${p.version} published; PDF fingerprint recorded`, { policyId: p.id });
    persist();
    return result;
  }
  function discardDraft(id) {
    requireManage();
    const p = pol(id);
    if (!p.draft) return;
    logEvent('policy.version.discarded', `${p.id} draft v${p.draft.version} discarded`, { policyId: p.id });
    p.draft = null;
    persist();
  }
  function setReviewDate(id, date, note) {
    requireManage();
    const p = pol(id);
    const prev = p.review;
    p.review = date;
    logEvent('policy.review.rescheduled', `${p.id} review date changed from ${WA.fmtDate(prev)} to ${WA.fmtDate(date)}${note ? ': ' + note : ''}`, { policyId: p.id });
    persist();
  }
  function completeReview(id, nextDate, note) {
    requireManage();
    const p = pol(id);
    p.lastReviewed = db.today;
    p.review = nextDate;
    if (p.status === 'Under Review') p.status = 'Published';
    logEvent('policy.review.completed', `${p.id} review completed; next review ${WA.fmtDate(nextDate)}${note ? ' — ' + note : ''}`, { policyId: p.id });
    persist();
  }
  function reviewInfo(p) {
    const days = diffDays(p.review, db.today);
    const state = days < 0 ? 'Review overdue' : days <= 7 ? 'Due in 7 days' : days <= 30 ? 'Due in 30 days' : days <= 60 ? 'Due in 60 days' : 'Current';
    const alerts = [60, 30, 7].map((n) => ({ n, date: addDays(p.review, -n), sent: addDays(p.review, -n) <= db.today }));
    return { days, state, alerts, lapsed: days < 0 };
  }

  /* ---------- Entra ID simulation ---------- */
  function simulateNewJoiner() {
    requireManage();
    const r = WA.mulberry32(db.seq.employee * 7919);
    const first = ['Aya', 'Nasser', 'Lina', 'Marwan', 'Kavya', 'Oliver', 'Sana', 'Imran', 'Julia', 'Zayed'];
    const last = ['Bishara', 'Haddadin', 'Rao', 'Sutherland', 'Matar', 'Quinn', 'Odeh', 'Lowe', 'Saba', 'Ferrari'];
    let name;
    for (let i = 0; i < 50; i++) { name = `${first[Math.floor(r() * first.length)]} ${last[Math.floor(r() * last.length)]}`; if (!db.employees.some((e) => e.name === name)) break; }
    const d = db.departments[Math.floor(r() * db.departments.length)];
    const mgr = db.employees.find((e) => e.deptId === d.id && e.managerId === d.headId);
    const e = {
      id: `E${db.seq.employee++}`, name, deptId: d.id, title: 'New Joiner — ' + (d.team || d.name), managerId: mgr ? mgr.id : d.headId,
      business: d.id === 'GRP' ? 'Waha Capital' : 'Waha Investments', email: `${name.toLowerCase().replace(/[^a-z ]/g, '').replace(/ +/g, '.')}@waha-demo.example`,
      joinDate: db.today, status: 'Active',
    };
    db.employees.push(e);
    idx.emp.set(e.id, e);
    const c = db.campaigns.find((x) => x.type === 'New joiner' && x.status === 'Active');
    let created = 0;
    if (c) {
      c.items.forEach(([pid, ver]) => {
        const a = { id: `ATT-${String(db.seq.assignment++).padStart(6, '0')}`, campaignId: c.id, employeeId: e.id, policyId: pid, version: ver, assigned: db.today, due: addDays(db.today, db.settings.windowDays), status: 'Pending', openedAt: null, ackAt: null, receipt: null, initials: null, channel: null, readSeconds: null, outcome: null, reason: null, escManual: 0, sim: 0, originalDue: null };
        db.assignments.push(a);
        indexAssignment(a);
        created++;
      });
      notify(e.id, 'notify', 'Email & Teams', `Welcome — ${created} policies to acknowledge`, 'New joiner policy pack (simulated).', '#/attestation');
    }
    logEvent('joiner.detected', `Entra ID sync (simulated): new joiner ${e.name} (${e.id}, ${d.team || d.name}) detected; ${created} policies assigned via "${c ? c.name : '—'}"`, { employeeId: e.id, campaignId: c ? c.id : undefined });
    persist();
    return { employee: e, created };
  }
  function simulateLeaver(empId) {
    requireManage();
    const e = emp(empId);
    if (!e || e.status !== 'Active') throw new Error('Select an active employee.');
    if (PERSONA_IDS().includes(empId)) throw new Error('Demo personas cannot be marked as leavers.');
    e.status = 'Leaver';
    e.leftDate = db.today;
    let withdrawn = 0;
    asgFor(empId).filter(isOpen).forEach((a) => { a.status = 'Withdrawn'; a.outcome = 'Withdrawn (leaver)'; a.closedAt = demoNow(); withdrawn++; });
    logEvent('leaver.detected', `Entra ID sync (simulated): ${e.name} (${e.id}) left; ${withdrawn} open assignments withdrawn`, { employeeId: e.id });
    persist();
    return withdrawn;
  }

  /* ---------- metrics ---------- */
  function summarize(list) {
    const s = { total: 0, ack: 0, late: 0, pending: 0, progress: 0, overdue: 0, exempt: 0, noncompliant: 0, withdrawn: 0 };
    list.forEach((a) => {
      const st = statusOf(a);
      s.total++;
      if (st === 'Acknowledged') { s.ack++; if (a.outcome === 'Acknowledged late') s.late++; }
      else if (st === 'Overdue') s.overdue++;
      else if (st === 'Exempted') s.exempt++;
      else if (st === 'Non-compliant') s.noncompliant++;
      else if (st === 'Withdrawn') s.withdrawn++;
      else if (st === 'In Progress') { s.progress++; s.pending++; }
      else s.pending++;
    });
    s.applicable = s.total - s.exempt - s.withdrawn;
    s.rate = pct(s.ack, s.applicable);
    s.open = s.pending + s.overdue;
    return s;
  }
  function campaignStats(cid) { return summarize(asgByCamp(cid)); }

  WA.svc = {
    init, resetAll, persist, persistNow, state, today, settings, demoNow,
    emp, pol, camp, dept, deptName, teamName, empName, asg, asgFor, asgByCamp, asgByPol, activeEmployees, directReports, lineManagerOf, deptHeadOf,
    persona, user, can, setPersona,
    isOpen, statusOf, simToday, daysToDue, escStage, STAGE_LABEL, milestones, timeline, refDate,
    logEvent, notify, notificationsFor, unreadCount, markRead, markAllRead,
    openForReading, acknowledge, byReceipt,
    sendReminder, escalate, extend, exempt, nonCompliant, resolveLate, simulateEmployeeAck, simulateStep, advanceCampaign, resetSimulation,
    audienceEmployees, audienceLabel, previewAssignments, launchCampaign, launchScheduledNow, closeCampaign,
    addPolicy, updatePolicy, createVersion, publishPolicy, discardDraft, suggestVersion, compareVersions, setReviewDate, completeReview, reviewInfo,
    simulateNewJoiner, simulateLeaver, summarize, campaignStats,
  };
})();
