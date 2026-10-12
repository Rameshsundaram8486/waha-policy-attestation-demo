/* Campaign management (list, 5-step wizard, detail), assignment actions, notifications & escalation centre. */
(function () {
  'use strict';
  const WA = window.WA;
  const { html, raw, icon, fmtDate, fmtDateTime } = WA;
  const S = () => WA.svc;
  const sel = (c) => (c ? raw('selected') : '');
  const chk = (c) => (c ? raw('checked') : '');

  const TYPES = [
    { type: 'Annual', trigger: 'Date set by the policy owner, e.g. start of the year', audience: 'All in-scope employees, each policy to its own audience' },
    { type: 'Regulatory change', trigger: 'Owner publishes a major version flagged "regulatory"', audience: 'Employees covered by that policy' },
    { type: 'Policy update', trigger: 'Owner publishes a major version or new policy needing re-attestation', audience: 'Employees covered by that policy' },
    { type: 'Exception / ad hoc', trigger: 'Launched manually by the policy owner', audience: 'Named people or a group' },
    { type: 'New joiner', trigger: 'Employee appears in Entra ID', audience: 'The new joiner, from day one' },
  ];

  /* =====================================================================
     Campaign list
     ===================================================================== */
  WA.views.campaigns = {
    title: 'Campaign Management',
    perm: 'manage',
    render() {
      const list = S().state().campaigns.slice().sort((a, b) => (a.status === b.status ? (a.launch < b.launch ? 1 : -1) : ['Active', 'Scheduled', 'Closed'].indexOf(a.status) - ['Active', 'Scheduled', 'Closed'].indexOf(b.status)));
      const active = list.filter((c) => c.status === 'Active');
      const activeA = active.flatMap((c) => S().asgByCamp(c.id));
      const sum = S().summarize(activeA);
      return html`${WA.crumbs([{ label: 'Policy Management' }, { label: 'Campaign Management' }])}
        <div class="page-head"><div><h1 class="page-title">Campaign Management</h1><p class="page-sub">Set up, launch and track attestation campaigns. Launching creates one assignment per person, per policy, per version and sends simulated email and Teams notices.</p></div>
          <a class="btn btn-primary" href="#/campaigns/new">${icon('plus', 16)} New campaign</a></div>
        <div class="kpis">
          ${WA.kpi({ label: 'Active campaigns', value: active.length, iconName: 'megaphone' })}
          ${WA.kpi({ label: 'Scheduled', value: list.filter((c) => c.status === 'Scheduled').length, iconName: 'calendar' })}
          ${WA.kpi({ label: 'Closed', value: list.filter((c) => c.status === 'Closed').length, iconName: 'archive' })}
          ${WA.kpi({ label: 'Active assignments', value: activeA.length.toLocaleString('en-GB'), iconName: 'clipboard-check', sub: `${sum.open} open · ${sum.overdue} overdue` })}
          ${WA.kpi({ label: 'Completion (active)', value: WA.fmtPct(sum.rate), iconName: 'percent', bar: sum.rate })}
        </div>
        <div class="table-wrap"><table class="table"><caption class="sr-only">Campaigns</caption>
          <thead><tr><th>Campaign</th><th>Type</th><th>Audience</th><th>Launch</th><th>Due</th><th class="num">Policies</th><th class="num">Assigned</th><th>Completion</th><th>Status</th><th class="actions"></th></tr></thead>
          <tbody>${list.map((c) => {
            const s = S().campaignStats(c.id);
            return html`<tr>
              <td><a class="cell-title" href="#/campaigns/${c.id}">${c.name}</a><div class="cell-sub">${c.id}</div></td>
              <td>${c.type}</td><td class="small">${S().audienceLabel(c.audience)}</td>
              <td class="nowrap">${c.rolling ? 'Rolling' : fmtDate(c.launch)}</td><td class="nowrap">${c.rolling ? '14 days from joining' : fmtDate(c.due)}</td>
              <td class="num">${c.items.length}</td><td class="num">${s.total.toLocaleString('en-GB')}</td>
              <td>${s.total ? WA.meter(s.rate) : html`<span class="muted small">Not launched</span>`}</td>
              <td>${WA.badge(c.status)}</td>
              <td class="actions"><a class="btn btn-ghost btn-sm" href="#/campaigns/${c.id}">${icon('eye', 15)} Open</a></td></tr>`;
          })}</tbody></table></div>
        <h2 class="section-title section-title--sm">What triggers a campaign</h2>
        <div class="table-wrap"><table class="table table--compact"><thead><tr><th>Campaign type</th><th>Trigger</th><th>Audience</th></tr></thead><tbody>
          ${TYPES.map((t) => html`<tr><td class="cell-title">${t.type}</td><td>${t.trigger}</td><td>${t.audience}</td></tr>`)}
        </tbody></table></div>`;
    },
  };

  /* =====================================================================
     Campaign creation wizard
     ===================================================================== */
  const STEPS = ['Campaign details', 'Policy selection', 'Audience', 'Schedule', 'Review & launch'];
  let wz = null;
  function newWizard(query) {
    const t = S().today();
    wz = {
      step: 0, result: null, empQ: '',
      d: { name: '', type: 'Exception / ad hoc', description: '', items: {}, audType: 'all', business: [], departments: [], named: [], respectPolicyAudience: true, launch: t, due: WA.addDays(t, S().settings().windowDays), reminders: S().settings().reminderDays.slice() },
    };
    if (query.type && TYPES.some((x) => x.type === query.type)) wz.d.type = query.type;
    if (query.policy && S().pol(query.policy)) {
      const p = S().pol(query.policy);
      wz.d.items[p.id] = p.version;
      wz.d.name = `${p.title} v${p.version} — ${wz.d.type === 'Regulatory change' ? 'regulatory attestation' : 'update attestation'}`;
      wz.d.description = `Re-attestation following publication of ${p.id} ${p.title} v${p.version}.`;
      if (p.audience.type === 'department') { wz.d.audType = 'department'; wz.d.departments = p.audience.values.slice(); }
    }
  }
  const publishable = () => S().state().policies.filter((p) => p.attestation && p.versions.length && p.status !== 'Draft').sort((a, b) => a.id.localeCompare(b.id));
  function draftAudience() {
    const d = wz.d;
    if (d.audType === 'business') return { type: 'business', values: d.business };
    if (d.audType === 'department') return { type: 'department', values: d.departments };
    if (d.audType === 'named') return { type: 'named', values: d.named };
    return { type: 'all', values: [] };
  }
  const draftItems = () => Object.entries(wz.d.items).map(([pid, ver]) => [pid, ver]);

  function stepBody() {
    const d = wz.d;
    if (wz.step === 0) {
      return html`<div class="form-grid">
        <div class="field span-2"><label for="wz-name">Campaign name <span class="req">*</span></label><input id="wz-name" class="input" name="name" value="${d.name}" maxlength="100" placeholder="e.g. Q4 Conduct Refresh 2026"></div>
        <div class="field span-2"><span class="label">Campaign type <span class="req">*</span></span><div class="choice-grid">
          ${TYPES.map((t) => html`<label class="choice"><input type="radio" name="type" value="${t.type}" ${chk(d.type === t.type)}><div><b>${t.type}</b><span>${t.trigger}</span></div></label>`)}
        </div></div>
        <div class="field span-2"><label for="wz-desc">Description</label><textarea id="wz-desc" class="textarea" name="description" maxlength="400" placeholder="Why is this campaign being run?">${d.description}</textarea></div>
      </div>`;
    }
    if (wz.step === 1) {
      return html`<p class="muted small" style="margin-top:0">Select one or more published policies that require attestation, and the version employees must acknowledge.</p>
        <div class="pick-list" role="group" aria-label="Policies">${publishable().map((p) => html`<label class="pick-row">
          <input type="checkbox" name="pol" value="${p.id}" ${chk(d.items[p.id])} data-change="wz-pol">
          <span><b>${p.title}</b><span class="cell-sub" style="display:block">${p.id} · ${S().deptName(p.deptId)} · ${S().audienceLabel(p.audience)}${p.regulatory ? ' · regulatory' : ''}</span></span>
          <select class="select" name="ver-${p.id}" aria-label="Version for ${p.id}" data-change="wz-ver" data-pid="${p.id}">${p.versions.slice().reverse().map((v) => html`<option value="${v.version}" ${sel((d.items[p.id] || p.version) === v.version)}>v${v.version}${v.version === p.version ? ' (current)' : ''}</option>`)}</select>
        </label>`)}</div>
        <p class="small" style="margin-bottom:0"><b id="wz-pol-count">${Object.keys(d.items).length}</b> selected</p>`;
    }
    if (wz.step === 2) {
      const emps = S().activeEmployees();
      const q = wz.empQ.toLowerCase();
      const shown = emps.filter((e) => !q || `${e.name} ${e.id} ${S().teamName(e.deptId)}`.toLowerCase().includes(q)).slice(0, 80);
      return html`<div class="choice-grid" role="radiogroup" aria-label="Audience">
          ${[['all', 'All employees', `${emps.length} active employees`], ['business', 'Business', 'Everyone in selected businesses'], ['department', 'Department', 'Everyone in selected departments'], ['named', 'Named employees', 'Pick individuals']].map(([v, l, s]) => html`<label class="choice"><input type="radio" name="audType" value="${v}" ${chk(d.audType === v)} data-change="wz-aud"><div><b>${l}</b><span>${s}</span></div></label>`)}
        </div>
        <div style="margin-top:16px">
          ${d.audType === 'business' ? html`<fieldset class="field" style="border:0;padding:0;margin:0"><legend class="label">Businesses <span class="req">*</span></legend><div class="row">${WA.vh.BIZ.map((b) => html`<label class="check"><input type="checkbox" name="business" value="${b.name}" ${chk(d.business.includes(b.name))} data-change="wz-aud-val">${b.name} (${emps.filter((e) => e.business === b.name).length})</label>`)}</div></fieldset>` : ''}
          ${d.audType === 'department' ? html`<fieldset class="field" style="border:0;padding:0;margin:0"><legend class="label">Departments <span class="req">*</span></legend><div class="row">${S().state().departments.map((x) => html`<label class="check"><input type="checkbox" name="departments" value="${x.id}" ${chk(d.departments.includes(x.id))} data-change="wz-aud-val">${x.name} (${emps.filter((e) => e.deptId === x.id).length})</label>`)}</div></fieldset>` : ''}
          ${d.audType === 'named' ? html`<div class="field"><label for="wz-emp-q">Find employees</label><input id="wz-emp-q" class="input" type="search" placeholder="Name, ID or team" value="${wz.empQ}" data-input="wz-emp-q"></div>
            <div class="pick-list" style="margin-top:8px" id="wz-emp-list">${shown.map((e) => html`<label class="pick-row" style="grid-template-columns:24px 1fr"><input type="checkbox" name="named" value="${e.id}" ${chk(d.named.includes(e.id))} data-change="wz-aud-val"><span>${e.name} <span class="cell-sub">${e.id} · ${e.title} · ${S().teamName(e.deptId)}</span></span></label>`)}</div>
            <p class="small muted">${d.named.length} selected · showing ${shown.length} of ${emps.length}. Demo personas: Layla Haddad (E1001), Karim Nasser (E1002).</p>` : ''}
          <label class="check" style="margin-top:14px"><input type="checkbox" name="respect" ${chk(d.respectPolicyAudience)} data-change="wz-respect"><span>Respect each policy’s own audience (assign a policy only to employees it covers)</span></label>
        </div>
        <div class="summary-box" style="margin-top:16px" id="wz-preview">${previewBox()}</div>`;
    }
    if (wz.step === 3) {
      const s = S().settings();
      return html`<div class="form-grid">
        <div class="field"><label for="wz-launch">Launch date <span class="req">*</span></label><input id="wz-launch" class="input" type="date" name="launch" value="${d.launch}" min="${S().today()}"><span class="hint">Today launches immediately; a future date schedules the campaign.</span></div>
        <div class="field"><label for="wz-due">Due date <span class="req">*</span></label><input id="wz-due" class="input" type="date" name="due" value="${d.due}"><span class="hint">Standard window: ${s.windowDays} days.</span></div>
        <fieldset class="field span-2" style="border:0;padding:0;margin:0"><legend class="label">Reminders before the due date</legend>
          <div class="row">${[3, 5, 7, 10, 13].map((n) => html`<label class="check"><input type="checkbox" name="reminders" value="${n}" ${chk(d.reminders.includes(n))}>Day ${n}</label>`)}</div>
          <span class="hint">Escalations follow the configured schedule: day ${s.escalationDays.join(', day ')} (line manager, policy owner, department head), then every ${s.weeklyAfterDays} days until resolved.</span></fieldset>
      </div>`;
    }
    const pv = S().previewAssignments({ items: draftItems(), audience: draftAudience(), respectPolicyAudience: d.respectPolicyAudience });
    const scheduled = d.launch > S().today();
    return html`<div class="grid grid-2">
      <div class="summary-box"><dl class="kv">
        <dt>Name</dt><dd>${d.name}</dd><dt>Type</dt><dd>${d.type}</dd><dt>Description</dt><dd>${d.description || '—'}</dd>
        <dt>Audience</dt><dd>${S().audienceLabel(draftAudience())}${d.respectPolicyAudience ? ' (policy audiences respected)' : ''}</dd>
        <dt>Launch</dt><dd>${fmtDate(d.launch, 'long')} ${scheduled ? html`<span class="badge badge--progress">Scheduled</span>` : html`<span class="badge badge--teal">Launches now</span>`}</dd>
        <dt>Due</dt><dd>${fmtDate(d.due, 'long')}</dd><dt>Reminders</dt><dd>Days ${d.reminders.join(', ') || 'none'}</dd>
      </dl></div>
      <div class="summary-box"><h3 style="margin:0 0 8px;font-size:15px">Policies (${draftItems().length})</h3>
        <ul class="info-list">${draftItems().map(([pid, ver]) => html`<li>${pid} ${S().pol(pid).title} — v${ver}</li>`)}</ul>
        <hr class="hr"><div class="row" style="gap:18px"><div><div class="kpi-value" style="font-size:24px">${pv.create.toLocaleString('en-GB')}</div><div class="small muted">assignments to create</div></div>
        <div><div class="kpi-value" style="font-size:24px">${pv.people}</div><div class="small muted">employees</div></div>
        <div><div class="kpi-value" style="font-size:24px">${pv.skipped}</div><div class="small muted">duplicates skipped</div></div></div>
        ${pv.create === 0 ? WA.alertBox('warn', 'alert', 'Nothing to assign', ' Everyone in this audience already has these policy versions open or acknowledged. Choose another version or audience.') : ''}
      </div></div>
      ${WA.alertBox('sim', 'zap', 'Simulated launch', ' Launching writes assignments to this browser and posts notices to the in-app notification centre. No email or Teams message is sent.')}`;
  }
  function previewBox() {
    const pv = S().previewAssignments({ items: draftItems(), audience: draftAudience(), respectPolicyAudience: wz.d.respectPolicyAudience });
    return html`<b>Preview:</b> ${pv.employees} employees in audience → <b>${pv.create.toLocaleString('en-GB')}</b> assignments for <b>${pv.people}</b> people${pv.skipped ? `, ${pv.skipped} duplicates skipped` : ''}${pv.outOfAudience ? `, ${pv.outOfAudience} outside policy audience` : ''}.${draftItems().length ? '' : ' Select policies in step 2 to see counts.'}`;
  }
  function wizardMarkup() {
    if (wz.result) {
      const r = wz.result;
      return html`<section class="card"><div class="card-body" style="text-align:center;padding:36px 20px">
        <div style="width:64px;height:64px;margin:0 auto 12px;border-radius:50%;background:var(--success-bg);color:var(--success);display:flex;align-items:center;justify-content:center">${icon('check', 34)}</div>
        <h2 class="page-title" style="font-size:24px">${r.campaign.status === 'Scheduled' ? 'Campaign scheduled' : 'Campaign launched'}</h2>
        <p class="page-sub" style="margin:8px auto 18px">${r.campaign.status === 'Scheduled' ? `"${r.campaign.name}" will launch on ${fmtDate(r.campaign.launch, 'long')}.` : `"${r.campaign.name}" created ${r.created.toLocaleString('en-GB')} assignments for ${r.people} employees${r.skipped ? ` (${r.skipped} duplicates skipped)` : ''}. Simulated email and Teams notices are in the notification centre.`}</p>
        <div class="btn-group" style="justify-content:center"><a class="btn btn-primary" href="#/campaigns/${r.campaign.id}">View campaign</a><a class="btn btn-secondary" href="#/reports?campaign=${r.campaign.id}">Open reporting</a><button class="btn btn-ghost" type="button" data-action="wz-restart">Create another</button></div>
      </div></section>`;
    }
    return html`<ol class="wizard-steps">${STEPS.map((s, i) => html`<li class="${i < wz.step ? 'done' : i === wz.step ? 'current' : ''}" ${i === wz.step ? raw('aria-current="step"') : ''}><span class="n">${i < wz.step ? icon('check', 14) : i + 1}</span>${s}</li>`)}</ol>
      <section class="card"><div class="card-head"><h3>Step ${wz.step + 1} of ${STEPS.length}: ${STEPS[wz.step]}</h3></div>
        <form class="card-body" id="wz-form" data-form="wz-next" novalidate>${stepBody()}</form>
        <div class="modal-foot" style="border-radius:0 0 8px 8px">
          <a class="btn btn-ghost" href="#/campaigns">Cancel</a><span class="spacer"></span>
          ${wz.step > 0 ? html`<button class="btn btn-secondary" type="button" data-action="wz-back">${icon('arrow-left', 16)} Back</button>` : ''}
          ${wz.step < STEPS.length - 1 ? html`<button class="btn btn-primary" type="submit" form="wz-form">Next ${icon('arrow-right', 16)}</button>` : html`<button class="btn btn-primary" type="submit" form="wz-form">${icon('send', 16)} ${wz.d.launch > S().today() ? 'Schedule campaign' : 'Launch campaign'}</button>`}
        </div></section>`;
  }
  const refreshWizard = () => { WA.setHTML(WA.$('#wizard'), wizardMarkup()); const f = WA.$('#wizard input:not([type=hidden]), #wizard select'); if (f) f.focus(); };
  function stepError(msg) { WA.toast(msg, 'warn'); }
  function captureStep(form) {
    const d = wz.d;
    if (wz.step === 0) {
      const v = WA.validateForm(form, { name: { required: true, label: 'Campaign name', test: (x) => (x.length < 4 ? 'Use at least 4 characters.' : null) }, type: { required: true, label: 'Campaign type' } });
      if (!v) return false;
      d.name = v.name; d.type = v.type; d.description = v.description || '';
    } else if (wz.step === 1) {
      if (!Object.keys(d.items).length) { stepError('Select at least one policy.'); return false; }
    } else if (wz.step === 2) {
      const aud = draftAudience();
      if (aud.type !== 'all' && !aud.values.length) { stepError('Choose at least one business, department or employee.'); return false; }
      if (!S().audienceEmployees(aud).length) { stepError('This audience has no active employees.'); return false; }
    } else if (wz.step === 3) {
      const v = WA.validateForm(form, {
        launch: { required: true, label: 'Launch date', test: (x) => (x < S().today() ? 'Launch date cannot be in the past.' : null) },
        due: { required: true, label: 'Due date', test: (x, all) => (x <= all.launch ? 'Due date must be after the launch date.' : WA.diffDays(x, all.launch) > 90 ? 'Keep the window within 90 days.' : null) },
      });
      if (!v) return false;
      d.launch = v.launch; d.due = v.due; d.reminders = [].concat(v.reminders || []).map(Number).filter((n) => WA.addDays(v.launch, n) < v.due);
    }
    return true;
  }
  WA.handle('submit', 'wz-next', (form) => {
    if (!captureStep(form)) return;
    if (wz.step < STEPS.length - 1) { wz.step++; refreshWizard(); return; }
    const pv = S().previewAssignments({ items: draftItems(), audience: draftAudience(), respectPolicyAudience: wz.d.respectPolicyAudience });
    if (pv.create === 0 && wz.d.launch <= S().today()) { stepError('Nothing to assign — adjust policies or audience.'); return; }
    try {
      wz.result = S().launchCampaign({ ...wz.d, items: draftItems(), audience: draftAudience() });
      WA.toast(wz.result.campaign.status === 'Scheduled' ? 'Campaign scheduled.' : `Campaign launched: ${wz.result.created} assignments created.`);
      WA.app.refreshChrome();
      refreshWizard();
    } catch (err) { WA.toast(err.message, 'bad'); }
  });
  WA.handle('click', 'wz-back', () => { wz.step = Math.max(0, wz.step - 1); refreshWizard(); });
  WA.handle('click', 'wz-restart', () => { newWizard({}); refreshWizard(); });
  WA.handle('change', 'wz-pol', (el) => {
    const pid = el.value;
    if (el.checked) wz.d.items[pid] = el.closest('.pick-row').querySelector('select').value; else delete wz.d.items[pid];
    WA.$('#wz-pol-count').textContent = Object.keys(wz.d.items).length;
  });
  WA.handle('change', 'wz-ver', (el) => {
    const pid = el.dataset.pid;
    wz.d.items[pid] = el.value;
    const cb = el.closest('.pick-row').querySelector('input[type=checkbox]');
    cb.checked = true;
    WA.$('#wz-pol-count').textContent = Object.keys(wz.d.items).length;
  });
  WA.handle('change', 'wz-aud', (el) => { wz.d.audType = el.value; refreshWizard(); });
  WA.handle('change', 'wz-aud-val', (el) => {
    const arr = wz.d[el.name];
    const i = arr.indexOf(el.value);
    if (el.checked && i < 0) arr.push(el.value);
    if (!el.checked && i >= 0) arr.splice(i, 1);
    WA.setHTML(WA.$('#wz-preview'), previewBox());
  });
  WA.handle('change', 'wz-respect', (el) => { wz.d.respectPolicyAudience = el.checked; WA.setHTML(WA.$('#wz-preview'), previewBox()); });
  WA.handle('input', 'wz-emp-q', WA.debounce((el) => {
    wz.empQ = el.value;
    WA.setHTML(WA.$('#wizard'), wizardMarkup());
    const input = WA.$('#wz-emp-q');
    if (input) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
  }, 200));

  WA.views.campaignWizard = {
    title: 'New campaign',
    perm: 'manage',
    render(params, query) {
      if (!wz || wz.result || query.policy || query.type) newWizard(query);
      return html`${WA.crumbs([{ label: 'Campaign Management', href: '#/campaigns' }, { label: 'New campaign' }])}
        <div class="page-head"><div><h1 class="page-title">Create an attestation campaign</h1><p class="page-sub">Five steps: details, policies, audience, schedule, then review and launch.</p></div></div>
        <div id="wizard">${wizardMarkup()}</div>`;
    },
  };

  /* =====================================================================
     Assignment drawer (owner actions, read-only for others)
     ===================================================================== */
  function assignmentDrawer(aid) {
    const a = S().asg(aid);
    if (!a) return;
    const close = WA.openOverlay({ title: 'Attestation record', drawer: true, size: 'wide', body: drawerBody(a) });
    drawerState.close = close;
    drawerState.aid = aid;
  }
  const drawerState = { aid: null, close: null };
  function refreshDrawer() {
    const body = WA.$('#overlay-root .drawer .modal-body');
    const a = drawerState.aid && S().asg(drawerState.aid);
    if (body && a) WA.setHTML(body, drawerBody(a));
  }
  function drawerBody(a) {
    const e = S().emp(a.employeeId);
    const p = S().pol(a.policyId);
    const c = S().camp(a.campaignId);
    const st = S().statusOf(a);
    const open = S().isOpen(a);
    const stage = S().escStage(a);
    const manage = S().can('manage');
    const simDay = WA.diffDays(S().simToday(a), a.assigned);
    const next = open ? S().milestones(a).find((m) => m.date > S().simToday(a)) : null;
    const mgr = S().lineManagerOf(a.employeeId);
    return html`<div class="row row--between" style="align-items:flex-start">
        <div class="row" style="gap:12px">${WA.avatar(e.name, 'lg')}<div><b style="font-size:16px">${e.name}</b><div class="small muted">${e.id} · ${e.title} · ${S().teamName(e.deptId)}</div><div class="small muted">Line manager: ${mgr ? mgr.name : '—'}</div></div></div>
        <div style="text-align:right">${WA.badge(st)}${stage ? html`<div class="small" style="margin-top:6px;color:var(--error)">${S().STAGE_LABEL[stage]}</div>` : ''}</div>
      </div>
      <hr class="hr">
      <dl class="kv">
        <dt>Record ID</dt><dd class="mono">${a.id}</dd>
        <dt>Policy</dt><dd><a href="#/policy/${p.id}">${p.id} — ${p.title}</a> · v${a.version}</dd>
        <dt>Campaign</dt><dd>${c ? html`<a href="#/campaigns/${c.id}">${c.name}</a>` : '—'}</dd>
        <dt>Assigned / due</dt><dd>${fmtDate(a.assigned)} / ${fmtDate(a.due)}${a.originalDue ? html` <span class="cell-sub">(originally ${fmtDate(a.originalDue)})</span>` : ''}</dd>
        ${open ? html`<dt>Workflow clock</dt><dd>Day ${simDay} ${a.sim ? WA.simBadge(`+${a.sim} simulated days`) : ''}${next ? html`<div class="cell-sub">Next: ${next.label} on ${fmtDate(next.date)}</div>` : ''}</dd>` : ''}
        ${a.ackAt ? html`<dt>Acknowledged</dt><dd>${fmtDateTime(a.ackAt)} · receipt <a class="mono" href="#/receipt/${a.receipt}">${a.receipt}</a></dd>` : ''}
        ${a.outcome ? html`<dt>Outcome</dt><dd>${WA.badge(a.outcome)}${a.resolvedAt ? html` <span class="cell-sub">closed ${fmtDate(a.resolvedAt)}</span>` : ''}</dd>` : ''}
        ${a.reason ? html`<dt>Reason</dt><dd>${a.reason}</dd>` : ''}
      </dl>
      ${manage ? html`<h3 style="font-size:15px;margin:22px 0 10px">Actions ${WA.simBadge('Demo events')}</h3>
        ${open ? html`<div class="btn-group">
            <button class="btn btn-primary btn-sm" type="button" data-action="as-step" data-id="${a.id}" ${next ? '' : raw('disabled')}>${icon('skip-forward', 15)} Simulate next workflow step</button>
            <button class="btn btn-secondary btn-sm" type="button" data-action="as-remind" data-id="${a.id}">${icon('send', 15)} Send reminder</button>
            <button class="btn btn-secondary btn-sm" type="button" data-action="as-escalate" data-id="${a.id}" ${stage >= 3 ? raw('disabled') : ''}>${icon('arrow-up', 15)} Escalate</button>
            <button class="btn btn-secondary btn-sm" type="button" data-action="as-reason" data-kind="extend" data-id="${a.id}">${icon('calendar-plus', 15)} Extend due date</button>
            <button class="btn btn-secondary btn-sm" type="button" data-action="as-reason" data-kind="exempt" data-id="${a.id}">${icon('user-x', 15)} Exempt</button>
            <button class="btn btn-secondary btn-sm" type="button" data-action="as-sim-ack" data-id="${a.id}">${icon('file-check', 15)} Simulate employee acknowledgement</button>
            <button class="btn btn-danger btn-sm" type="button" data-action="as-reason" data-kind="noncompliant" data-id="${a.id}">${icon('ban', 15)} Record non-compliant</button>
          </div>` : a.outcome === 'Acknowledged late' && !a.resolvedAt ? html`<div class="btn-group"><button class="btn btn-primary btn-sm" type="button" data-action="as-reason" data-kind="resolve" data-id="${a.id}">${icon('check', 15)} Close as acknowledged late</button></div>`
          : html`<p class="small muted">This record is closed and locked (simulated). Outcomes cannot be edited.</p>`}`
      : html`<div class="alert alert--info" style="margin-top:18px">${icon('lock', 18)}<div>Read-only view for the ${S().persona().label} persona.</div></div>`}
      <h3 style="font-size:15px;margin:22px 0 10px">Timeline</h3>
      <ul class="timeline">${S().timeline(a).map((t) => html`<li class="${t.future ? 'tl-future' : ''}"><span class="tl-dot ${t.future ? 'future' : t.tone}">${icon(t.kind === 'ack' ? 'check' : t.kind === 'escalation' ? 'arrow-up' : t.kind === 'opened' ? 'eye' : t.kind === 'notify' ? 'mail' : 'clock', 12)}</span>
        <div class="tl-title">${t.title} ${t.simulated ? WA.simBadge() : ''}${t.future ? html` <span class="badge badge--neutral badge--plain">scheduled</span>` : ''}</div><div class="tl-meta">${/T/.test(t.ts) ? fmtDateTime(t.ts) : fmtDate(t.ts)}${t.meta ? ' · ' + t.meta : ''}</div></li>`)}</ul>`;
  }
  const afterAction = (msg) => { WA.toast(msg); refreshDrawer(); WA.app.refresh({ keepOverlays: true }); WA.app.refreshChrome(); };
  WA.handle('click', 'open-assignment', (el) => assignmentDrawer(el.dataset.id));
  WA.handle('click', 'as-step', (el) => { try { const m = S().simulateStep(el.dataset.id); afterAction(`Simulated: ${m.label}.`); } catch (err) { WA.toast(err.message, 'bad'); } });
  WA.handle('click', 'as-remind', (el) => { try { S().sendReminder(el.dataset.id); afterAction('Reminder sent (simulated email and Teams).'); } catch (err) { WA.toast(err.message, 'bad'); } });
  WA.handle('click', 'as-escalate', (el) => { try { S().escalate(el.dataset.id); afterAction('Escalated to the next stage (simulated).'); } catch (err) { WA.toast(err.message, 'bad'); } });
  WA.handle('click', 'as-sim-ack', (el) => { try { S().simulateEmployeeAck(el.dataset.id); afterAction('Employee acknowledgement simulated.'); } catch (err) { WA.toast(err.message, 'bad'); } });
  const REASON = {
    extend: { title: 'Extend due date', label: 'Reason for extension', btn: 'Extend', ph: 'e.g. Annual leave during campaign window', date: true },
    exempt: { title: 'Exempt employee', label: 'Exemption reason', btn: 'Record exemption', ph: 'e.g. Long-term leave; will attest on return' },
    noncompliant: { title: 'Record non-compliant outcome', label: 'Reason', btn: 'Record non-compliance', ph: 'e.g. No acknowledgement after stage 3 escalation', danger: true },
    resolve: { title: 'Close as acknowledged late', label: 'Note (optional)', btn: 'Close item', ph: 'e.g. Acknowledged after return from leave', optional: true },
  };
  WA.handle('click', 'as-reason', (el) => {
    const k = REASON[el.dataset.kind];
    const a = S().asg(el.dataset.id);
    WA.openOverlay({
      title: k.title, size: 'sm',
      body: html`<form id="reason-form" data-form="as-reason-save" data-kind="${el.dataset.kind}" data-id="${a.id}" novalidate>
        <p class="small muted" style="margin-top:0">${S().empName(a.employeeId)} · ${S().pol(a.policyId).title} v${a.version}. The outcome is recorded with your name, the reason and a timestamp.</p>
        ${k.date ? html`<div class="field" style="margin-bottom:12px"><label for="rf-date">New due date <span class="req">*</span></label><input id="rf-date" class="input" type="date" name="date" value="${WA.addDays(a.due > S().simToday(a) ? a.due : S().simToday(a), 7)}"></div>` : ''}
        <div class="field"><label for="rf-reason">${k.label} ${k.optional ? '' : html`<span class="req">*</span>`}</label><textarea id="rf-reason" class="textarea" name="reason" maxlength="240" placeholder="${k.ph}"></textarea></div></form>`,
      foot: html`<button class="btn btn-secondary" type="button" data-close>Cancel</button><button class="btn ${k.danger ? 'btn-danger-solid' : 'btn-primary'}" type="submit" form="reason-form">${k.btn}</button>`,
    });
  });
  WA.handle('submit', 'as-reason-save', (form) => {
    const kind = form.dataset.kind;
    const k = REASON[kind];
    const a = S().asg(form.dataset.id);
    const rules = { reason: { required: !k.optional, label: k.label, test: (v) => (!k.optional && v.length < 5 ? 'Please give a short reason.' : null) } };
    if (k.date) rules.date = { required: true, label: 'New due date', test: (v) => (v <= a.due ? 'Must be later than the current due date.' : null) };
    const d = WA.validateForm(form, rules);
    if (!d) return;
    try {
      if (kind === 'extend') S().extend(a.id, d.date, d.reason);
      if (kind === 'exempt') S().exempt(a.id, d.reason);
      if (kind === 'noncompliant') S().nonCompliant(a.id, d.reason);
      if (kind === 'resolve') S().resolveLate(a.id, d.reason);
      // close only the reason modal (the topmost overlay)
      const modal = WA.$$('#overlay-root > div').pop();
      if (modal) modal.querySelector('[data-close]').click();
      afterAction({ extend: 'Due date extended.', exempt: 'Exemption recorded.', noncompliant: 'Non-compliant outcome recorded.', resolve: 'Closed as acknowledged late.' }[kind]);
    } catch (err) { WA.toast(err.message, 'bad'); }
  });

  /* =====================================================================
     Campaign detail
     ===================================================================== */
  const cd = { id: null, tab: 'all', q: '', dept: '', page: 1 };
  const TABS = [['all', 'All'], ['open', 'Open'], ['overdue', 'Overdue'], ['completed', 'Completed'], ['exempt', 'Exempted'], ['noncompliant', 'Non-compliant']];
  function filterAsg(list) {
    const q = cd.q.toLowerCase();
    return list.filter((a) => {
      const st = S().statusOf(a);
      const tabOk = cd.tab === 'all' || (cd.tab === 'open' && S().isOpen(a)) || (cd.tab === 'overdue' && st === 'Overdue') || (cd.tab === 'completed' && st === 'Acknowledged') || (cd.tab === 'exempt' && st === 'Exempted') || (cd.tab === 'noncompliant' && st === 'Non-compliant');
      if (!tabOk) return false;
      const e = S().emp(a.employeeId);
      if (cd.dept && e.deptId !== cd.dept) return false;
      return !q || `${e.name} ${e.id} ${a.policyId} ${a.id}`.toLowerCase().includes(q);
    });
  }
  function assignmentsTable(c) {
    const all = S().asgByCamp(c.id);
    const list = filterAsg(all).sort((a, b) => {
      const o = { Overdue: 0, 'In Progress': 1, Pending: 2 };
      return (o[S().statusOf(a)] ?? 9) - (o[S().statusOf(b)] ?? 9) || S().escStage(b) - S().escStage(a) || a.employeeId.localeCompare(b.employeeId);
    });
    const pg = WA.paginate(list, cd.page, 15);
    const count = (k) => { const keep = cd.tab; cd.tab = k; const n = filterAsg(all).length; cd.tab = keep; return n; };
    return html`<div class="tabs" role="tablist">${TABS.map(([k, l]) => html`<button type="button" role="tab" class="tab ${cd.tab === k ? 'active' : ''}" aria-selected="${cd.tab === k}" data-action="cd-tab" data-tab="${k}">${l}<span class="tab-count">${count(k)}</span></button>`)}</div>
      ${list.length ? html`<div class="table-wrap"><table class="table table--compact"><caption class="sr-only">Assignments</caption>
        <thead><tr><th>Employee</th><th>Policy</th><th>Due</th><th>Status</th><th>Escalation</th><th>Outcome</th><th class="actions"></th></tr></thead>
        <tbody>${pg.items.map((a) => {
          const e = S().emp(a.employeeId);
          const st = S().statusOf(a);
          const stage = S().escStage(a);
          return html`<tr>
            <td><b>${e.name}</b><div class="cell-sub">${e.id} · ${S().teamName(e.deptId)}</div></td>
            <td>${a.policyId} <span class="cell-sub">v${a.version}</span><div class="cell-sub">${S().pol(a.policyId).title}</div></td>
            <td class="nowrap">${fmtDate(a.due)}${S().isOpen(a) ? html`<div class="cell-sub">${WA.relDays(S().daysToDue(a))}${a.sim ? ' (sim)' : ''}</div>` : ''}</td>
            <td>${WA.badge(st)}</td>
            <td>${stage ? html`<span class="badge badge--overdue badge--plain">Stage ${stage}</span>` : html`<span class="muted">—</span>`}</td>
            <td class="small">${a.outcome || '—'}</td>
            <td class="actions"><button class="btn btn-ghost btn-sm" type="button" data-action="open-assignment" data-id="${a.id}">${S().can('manage') ? 'Manage' : 'View'}</button></td></tr>`;
        })}</tbody></table></div>${WA.pager(pg, 'cd-page')}` : WA.emptyState('No assignments in this view', c.status === 'Scheduled' ? 'Assignments are created when the campaign launches.' : 'Try another tab or clear the search.', 'inbox')}`;
  }
  const refreshCd = () => { const c = S().camp(cd.id); if (c) WA.setHTML(WA.$('#cd-assignments'), assignmentsTable(c)); };
  WA.handle('click', 'cd-tab', (el) => { cd.tab = el.dataset.tab; cd.page = 1; refreshCd(); });
  WA.handle('click', 'cd-page', (el) => { cd.page = Number(el.dataset.page); refreshCd(); });
  WA.handle('input', 'cd-q', WA.debounce((el) => { cd.q = el.value; cd.page = 1; refreshCd(); }, 150));
  WA.handle('change', 'cd-dept', (el) => { cd.dept = el.value; cd.page = 1; refreshCd(); });
  WA.handle('click', 'cd-advance', (el) => {
    try {
      const n = S().advanceCampaign(el.dataset.id, Number(el.dataset.days));
      WA.toast(`Simulated +${el.dataset.days} day${el.dataset.days === '1' ? '' : 's'}: ${n.reminder + n.weekly} reminders, ${n.escalation} escalations, ${n.due} due-date notices.`);
      WA.app.refresh(); WA.app.refreshChrome();
    } catch (err) { WA.toast(err.message, 'bad'); }
  });
  WA.handle('click', 'cd-reset-sim', async (el) => {
    if (!(await WA.confirmDialog({ title: 'Reset workflow simulation?', message: 'Simulated days and manual escalations are cleared for this campaign. Recorded outcomes and notifications are kept.', confirmLabel: 'Reset clock' }))) return;
    S().resetSimulation(el.dataset.id); WA.toast('Simulation clock reset.'); WA.app.refresh();
  });
  WA.handle('click', 'cd-launch', async (el) => {
    const c = S().camp(el.dataset.id);
    if (!(await WA.confirmDialog({ title: `Launch "${c.name}" now?`, message: 'Assignments are created immediately and the due date moves to keep the same window.', confirmLabel: 'Launch now' }))) return;
    try { const r = S().launchScheduledNow(c.id); WA.toast(`Launched: ${r.created} assignments for ${r.people} employees.`); WA.app.refresh(); WA.app.refreshChrome(); } catch (err) { WA.toast(err.message, 'bad'); }
  });
  WA.handle('click', 'cd-close', async (el) => {
    const c = S().camp(el.dataset.id);
    if (!(await WA.confirmDialog({ title: `Close "${c.name}"?`, message: 'The campaign is marked closed. Open items stay visible on the overdue register for outcome recording.', confirmLabel: 'Close campaign' }))) return;
    S().closeCampaign(c.id); WA.toast('Campaign closed.'); WA.app.refresh();
  });
  WA.handle('click', 'cd-export', (el) => {
    const c = S().camp(el.dataset.id);
    const list = filterAsg(S().asgByCamp(c.id));
    WA.download(`${c.id}_assignments_${S().today()}.csv`, WA.insights.assignmentCSV(list));
    WA.toast(`Exported ${list.length} rows to CSV.`);
  });
  WA.handle('click', 'cd-print', (el) => {
    const c = S().camp(el.dataset.id);
    const s = S().campaignStats(c.id);
    WA.printHTML(WA.insights.evidenceReport(`Campaign report — ${c.name}`, filterAsg(S().asgByCamp(c.id)), [`Campaign ${c.id} · ${c.type} · ${S().audienceLabel(c.audience)}`, `Launch ${fmtDate(c.launch)} · Due ${c.due ? fmtDate(c.due) : 'rolling'} · Completion ${WA.fmtPct(s.rate)} (${s.ack}/${s.applicable})`]), c.name);
  });

  function stageStrip(list) {
    const s = S().settings();
    const open = list.filter(S().isOpen);
    const counts = { notified: 0, reminder: 0, overdue: 0, e1: 0, e2: 0, e3: 0 };
    open.forEach((a) => {
      const st = S().escStage(a);
      if (st === 3) counts.e3++; else if (st === 2) counts.e2++; else if (st === 1) counts.e1++;
      else if (S().statusOf(a) === 'Overdue') counts.overdue++;
      else if (WA.diffDays(S().simToday(a), a.assigned) >= s.reminderDays[0]) counts.reminder++;
      else counts.notified++;
    });
    const st = [
      { day: 'Day 0', name: 'Notification', who: 'Employee', n: counts.notified },
      { day: `Days ${s.reminderDays.join(', ')}`, name: 'Reminders', who: 'Employee', n: counts.reminder },
      { day: `Day ${s.windowDays}`, name: 'Due date — overdue', who: '—', n: counts.overdue },
      { day: `Day ${s.escalationDays[0]}`, name: 'Escalation 1', who: 'Employee + line manager', n: counts.e1, esc: true },
      { day: `Day ${s.escalationDays[1]}`, name: 'Escalation 2', who: 'Policy owner + manager', n: counts.e2, esc: true },
      { day: `Day ${s.escalationDays[2]}`, name: 'Escalation 3', who: 'Dept head + policy owner', n: counts.e3, esc: true },
      { day: `After ${s.escalationDays[2]}`, name: 'Weekly reminders', who: 'Employee + manager', n: null },
      { day: 'Closed', name: 'Completed / outcome', who: 'Locked record', n: list.length - open.length },
    ];
    return html`<div class="stages">${st.map((x) => html`<div class="stage ${x.esc ? 'esc' : ''} ${x.n ? 'reached' : ''}"><div class="s-dot">${x.n != null ? x.n : ''}</div><div class="s-day">${x.day}</div><div class="s-name">${x.name}</div><div class="s-who">${x.who}</div></div>`)}</div>
      <p class="small muted" style="margin:4px 0 0">Numbers show how many items currently sit at each stage.</p>`;
  }

  WA.views.campaignDetail = {
    title: 'Campaign',
    perm: 'manage',
    render(params) {
      const c = S().camp(params.id);
      if (!c) return WA.views.notFound.render();
      if (cd.id !== c.id) Object.assign(cd, { id: c.id, tab: c.id === 'CMP-2026-001' ? 'overdue' : 'all', q: '', dept: '', page: 1 });
      this.title = c.name;
      const list = S().asgByCamp(c.id);
      const s = S().summarize(list);
      const simulated = list.some((a) => a.sim);
      return html`${WA.crumbs([{ label: 'Campaign Management', href: '#/campaigns' }, { label: c.name }])}
        <div class="page-head"><div><h1 class="page-title">${c.name}</h1><p class="page-sub">${c.id} · ${c.type} · ${S().audienceLabel(c.audience)} · owner ${S().empName(c.ownerId)}</p>
          <div class="row" style="margin-top:10px">${WA.badge(c.status)} ${simulated ? WA.simBadge('Workflow clock advanced') : ''}</div></div>
          <div class="btn-group">
            ${c.status === 'Scheduled' ? html`<button class="btn btn-primary" type="button" data-action="cd-launch" data-id="${c.id}">${icon('play', 16)} Launch now</button>` : ''}
            ${c.status === 'Active' ? html`<button class="btn btn-primary" type="button" data-action="cd-advance" data-id="${c.id}" data-days="7">${icon('zap', 16)} Simulate workflow +7 days</button>
              <button class="btn btn-secondary" type="button" data-action="cd-advance" data-id="${c.id}" data-days="1">+1 day</button>` : ''}
            ${simulated ? html`<button class="btn btn-ghost" type="button" data-action="cd-reset-sim" data-id="${c.id}">${icon('reset', 16)} Reset clock</button>` : ''}
            <button class="btn btn-secondary" type="button" data-action="cd-export" data-id="${c.id}">${icon('download', 16)} Export CSV</button>
            <button class="btn btn-secondary" type="button" data-action="cd-print" data-id="${c.id}">${icon('printer', 16)} Print</button>
            ${c.status === 'Active' && !c.rolling ? html`<button class="btn btn-ghost" type="button" data-action="cd-close" data-id="${c.id}">Close campaign</button>` : ''}
          </div></div>
        ${c.status === 'Active' ? WA.alertBox('sim', 'zap', 'Simulate Workflow', html` advances the workflow clock for every open item in this campaign, sending the reminders and escalations that would fall due (days ${S().settings().reminderDays.join(', ')}, ${S().settings().escalationDays.join(', ')}). All messages are simulated demo events. Use <b>Manage</b> on a row for item-level actions.`) : ''}
        <div class="kpis">
          ${WA.kpi({ label: 'Assigned', value: s.total.toLocaleString('en-GB'), iconName: 'clipboard-check', sub: `${new Set(list.map((a) => a.employeeId)).size} employees` })}
          ${WA.kpi({ label: 'Completed', value: s.ack.toLocaleString('en-GB'), iconName: 'check-circle', tone: 'good', sub: `${s.late} late` })}
          ${WA.kpi({ label: 'Pending', value: s.pending, iconName: 'clock', tone: 'warn', sub: `${s.progress} in progress` })}
          ${WA.kpi({ label: 'Overdue', value: s.overdue, iconName: 'alert', tone: s.overdue ? 'bad' : '' })}
          ${WA.kpi({ label: 'Exempted / non-compliant', value: `${s.exempt} / ${s.noncompliant}`, iconName: 'user-x' })}
          ${WA.kpi({ label: 'Completion', value: WA.fmtPct(s.rate), iconName: 'percent', bar: s.rate })}
        </div>
        <div class="grid grid-main">
          <section class="card"><div class="card-head"><h3>Workflow stages</h3><span class="sub">${S().settings().windowDays}-day window</span></div><div class="card-body">${stageStrip(list)}</div></section>
          <section class="card"><div class="card-head"><h3>Campaign set-up</h3></div><div class="card-body"><dl class="kv" style="grid-template-columns:110px 1fr">
            <dt>Launch</dt><dd>${c.rolling ? 'Rolling (Entra ID trigger)' : fmtDate(c.launch, 'long')}</dd><dt>Due</dt><dd>${c.due ? fmtDate(c.due, 'long') : '14 days after joining'}</dd>
            <dt>Policies</dt><dd>${c.items.map(([pid, ver]) => html`<div><a href="#/console/policy/${pid}">${pid}</a> ${S().pol(pid).title} <span class="cell-sub">v${ver}</span></div>`)}</dd>
            <dt>Description</dt><dd class="small">${c.description || '—'}</dd></dl></div></section>
        </div>
        <div class="section-row"><h2 class="section-title section-title--sm">Assignments</h2></div>
        <div class="toolbar">
          <div class="field field--grow"><label for="cd-q">Search</label><input id="cd-q" class="input" type="search" placeholder="Employee name or ID, policy ID, record ID" value="${cd.q}" data-input="cd-q"></div>
          <div class="field"><label for="cd-dept">Department</label><select id="cd-dept" class="select" data-change="cd-dept"><option value="">All</option>${S().state().departments.map((d) => html`<option value="${d.id}" ${sel(cd.dept === d.id)}>${d.team}</option>`)}</select></div>
        </div>
        <div id="cd-assignments">${assignmentsTable(c)}</div>`;
    },
  };

  /* =====================================================================
     Notifications, reminders & escalations centre
     ===================================================================== */
  const nc = { filter: 'all' };
  WA.handle('click', 'nc-filter', (el) => { nc.filter = el.dataset.f; WA.app.refresh(); });
  WA.handle('click', 'nc-read', (el) => { S().markRead(el.dataset.id); WA.app.refreshChrome(); WA.app.refresh(); });
  WA.handle('click', 'nc-read-all', () => { S().markAllRead(S().user().id); WA.app.refreshChrome(); WA.app.refresh(); });
  WA.handle('click', 'nc-step', (el) => { try { const m = S().simulateStep(el.dataset.id); WA.toast(`Simulated: ${m.label}.`); WA.app.refresh(); WA.app.refreshChrome(); } catch (err) { WA.toast(err.message, 'bad'); } });

  const NOTE_ICON = { escalation: 'arrow-up', reminder: 'clock', receipt: 'file-check', review: 'calendar', notify: 'mail' };
  function notificationItem(n, compact) {
    return html`<li class="notif ${n.read ? '' : 'unread'}">
      <span class="notif-ico ${n.kind}">${icon(NOTE_ICON[n.kind] || 'bell', 16)}</span>
      <div><div class="notif-title">${n.link ? html`<a href="${n.link}" data-action="nc-open" data-id="${n.id}">${n.subject}</a>` : n.subject}</div>
        ${compact ? '' : html`<div class="notif-body">${n.body}</div>`}
        <div class="notif-meta"><span>${fmtDateTime(n.ts)}</span><span>${icon(n.channel.includes('Teams') ? 'message' : 'mail', 12)} ${n.channel}</span>${WA.simBadge('Simulated')}${!n.read && !compact ? html`<button class="link-btn small" type="button" data-action="nc-read" data-id="${n.id}">Mark read</button>` : ''}</div></div></li>`;
  }
  WA.notificationItem = notificationItem;
  WA.handle('click', 'nc-open', (el) => { S().markRead(el.dataset.id); WA.app.refreshChrome(); });

  WA.views.notifications = {
    title: 'Notifications',
    render() {
      const u = S().user();
      const s = S().settings();
      const all = S().notificationsFor(u.id);
      const list = all.filter((n) => nc.filter === 'all' || (nc.filter === 'unread' && !n.read) || n.kind === nc.filter);
      const manage = S().can('manage');
      const queue = manage ? S().state().assignments.filter((a) => S().isOpen(a) && S().statusOf(a) === 'Overdue' && S().camp(a.campaignId).status !== 'Closed') : [];
      const byStage = [3, 2, 1, 0].map((st) => ({ st, items: queue.filter((a) => S().escStage(a) === st) }));
      const wfEvents = S().state().events.filter((e) => /workflow|reminder|escalat|joiner|leaver/.test(e.type)).slice(-12).reverse();
      const rows = [
        ['0', 'Notification', 'Employee (email and Teams)'],
        [s.reminderDays.join(', '), 'Reminders', 'Employee'],
        [String(s.windowDays), 'Due date; item becomes overdue', '—'],
        [String(s.escalationDays[0]), 'Escalation stage 1; overdue banner shown in the portal', 'Employee, copied to line manager'],
        [String(s.escalationDays[1]), 'Escalation stage 2; added to overdue register', 'Policy owner; second notice to line manager'],
        [String(s.escalationDays[2]), 'Escalation stage 3; formal non-compliance record', 'Department head (manager’s manager) and policy owner'],
        [`After ${s.escalationDays[2]}`, `Reminders every ${s.weeklyAfterDays} days until resolved`, 'Employee and line manager'],
      ];
      return html`${WA.crumbs([{ label: 'Policy Attestation' }, { label: 'Notifications' }])}
        <div class="page-head"><div><h1 class="page-title">Notifications, reminders &amp; escalations</h1><p class="page-sub">Every attestation follows the same automated cycle. In production Power Automate sends these by email and Teams; here they are simulated demo events.</p></div>
          ${manage ? html`<span class="chip">${icon('send', 14)} Simulated outbox: ${(S().state().outbox || { messages: 0 }).messages.toLocaleString('en-GB')} messages this session</span>` : ''}</div>
        <section class="card"><div class="card-head"><h3>Reminder and escalation schedule</h3><span class="sub">${s.windowDays}-day window · configurable without code${manage ? html` — <a href="#/console">edit</a>` : ''}</span></div>
          <div class="card-body card-body--flush"><table class="table table--compact"><thead><tr><th>Day</th><th>Action</th><th>Sent to</th></tr></thead><tbody>
          ${rows.map((r) => html`<tr><td class="nowrap"><b>${r[0]}</b></td><td>${r[1]}</td><td>${r[2]}</td></tr>`)}</tbody></table></div></section>
        <div class="grid grid-2" style="margin-top:16px">
          <section class="card"><div class="card-head"><h3>${icon('bell', 16)} My notifications</h3><button class="btn btn-ghost btn-sm" type="button" data-action="nc-read-all">Mark all read</button></div>
            <div class="card-body" style="padding-bottom:0"><div class="tabs" role="tablist">${[['all', 'All'], ['unread', 'Unread'], ['reminder', 'Reminders'], ['escalation', 'Escalations'], ['receipt', 'Receipts']].map(([k, l]) => html`<button class="tab ${nc.filter === k ? 'active' : ''}" type="button" role="tab" aria-selected="${nc.filter === k}" data-action="nc-filter" data-f="${k}">${l}</button>`)}</div></div>
            ${list.length ? html`<ul class="notif-list" style="max-height:560px">${list.map((n) => notificationItem(n))}</ul>` : html`<div class="card-body">${WA.emptyState('No notifications', 'Simulated emails and Teams messages for this persona appear here.', 'bell')}</div>`}
          </section>
          <div class="stack">
            ${manage ? html`<section class="card"><div class="card-head"><h3>${icon('alert', 16)} Escalation queue</h3><span class="sub">${queue.length} overdue items in active campaigns</span></div><div class="card-body">
              ${byStage.map(({ st, items }) => html`<div style="margin-bottom:14px"><div class="row row--between"><b class="small">${st ? `Stage ${st}` : 'Overdue — not yet escalated'}</b><span class="badge ${st ? 'badge--overdue' : 'badge--pending'} badge--plain">${items.length}</span></div>
                ${items.slice(0, 4).map((a) => html`<div class="row row--between small" style="padding:6px 0;border-bottom:1px solid #eef2f3"><span>${S().empName(a.employeeId)} · ${a.policyId} <span class="muted">${WA.diffDays(S().simToday(a), a.due)}d overdue</span></span>
                  <span><button class="btn btn-ghost btn-sm" type="button" data-action="open-assignment" data-id="${a.id}">Manage</button><button class="btn btn-ghost btn-sm" type="button" data-action="nc-step" data-id="${a.id}" title="Simulate next workflow step">${icon('skip-forward', 14)}</button></span></div>`)}
                ${items.length > 4 ? html`<div class="small muted" style="padding-top:4px">+ ${items.length - 4} more — see <a href="#/campaigns/CMP-2026-001">campaign detail</a></div>` : ''}</div>`)}
            </div></section>` : ''}
            <section class="card"><div class="card-head"><h3>${icon('history', 16)} Workflow activity log</h3></div><div class="card-body">
              ${wfEvents.length ? html`<ul class="timeline">${wfEvents.map((e) => html`<li><span class="tl-dot ${/escalat/.test(e.type) ? 'bad' : 'info'}">${icon('zap', 12)}</span><div class="tl-title">${e.detail} ${e.simulated ? WA.simBadge() : ''}</div><div class="tl-meta">${fmtDateTime(e.ts)} · ${S().empName(e.actorId)}</div></li>`)}</ul>` : html`<p class="muted small">No workflow activity yet.</p>`}
            </div></section>
          </div>
        </div>`;
    },
  };
})();
