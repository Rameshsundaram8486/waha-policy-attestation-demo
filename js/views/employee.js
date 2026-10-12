/* Employee experience: Attestation Centre, My Policies, Policy Reader, Receipt. */
(function () {
  'use strict';
  const WA = window.WA;
  const { html, icon, fmtDate, fmtDateTime } = WA;
  const S = () => WA.svc;

  const ORDER = { Overdue: 0, 'In Progress': 1, Pending: 2, Acknowledged: 3, Exempted: 4, 'Non-compliant': 5, Withdrawn: 6 };
  function sortAssignments(list) {
    return list.slice().sort((a, b) => {
      const sa = S().statusOf(a), sb = S().statusOf(b);
      if (ORDER[sa] !== ORDER[sb]) return ORDER[sa] - ORDER[sb];
      if (sa === 'Acknowledged') return a.ackAt < b.ackAt ? 1 : -1;
      return a.due < b.due ? -1 : a.due > b.due ? 1 : 0;
    });
  }

  function attCard(a) {
    const p = S().pol(a.policyId);
    const st = S().statusOf(a);
    const c = S().camp(a.campaignId);
    const d = S().daysToDue(a);
    const open = S().isOpen(a);
    const dueSoon = open && st !== 'Overdue' && d <= 3;
    const cls = st === 'Overdue' ? 'is-overdue' : dueSoon ? 'is-due-soon' : !open ? 'is-done' : '';
    return html`<article class="att-card ${cls}">
      <div class="att-ico">${icon(st === 'Acknowledged' ? 'file-check' : 'file', 22)}</div>
      <div>
        <div class="att-title">${p.title}</div>
        <div class="att-meta">
          <span>${icon('hash', 13)} ${p.id}</span><span>${icon('layers', 13)} v${a.version}</span><span>${icon('building', 13)} ${S().deptName(p.deptId)}</span>
          <span>${icon('calendar', 13)} Assigned ${fmtDate(a.assigned)}</span>
          <span>${icon('clock', 13)} Due ${fmtDate(a.due)}${open ? html` <b>(${WA.relDays(d)})</b>` : ''}</span>
          <span>${icon('megaphone', 13)} ${c ? c.name : '—'}</span>
        </div>
        ${a.outcome === 'Extended' && open ? html`<div class="cell-sub" style="margin-top:4px">Due date extended: ${a.reason}</div>` : ''}
        ${st === 'Exempted' ? html`<div class="cell-sub" style="margin-top:4px">Exempted: ${a.reason}</div>` : ''}
        ${st === 'Acknowledged' ? html`<div class="cell-sub" style="margin-top:4px">Acknowledged ${fmtDateTime(a.ackAt)} · receipt <span class="mono">${a.receipt}</span></div>` : ''}
      </div>
      <div class="att-actions">
        ${WA.badge(st)}
        ${open ? html`<a class="btn btn-primary" href="#/read/${a.id}">${icon('file-check', 16)} Read &amp; Acknowledge</a>` : ''}
        ${st === 'Acknowledged' ? html`<a class="btn btn-secondary btn-sm" href="#/receipt/${a.receipt}">${icon('eye', 15)} View receipt</a>` : ''}
      </div>
    </article>`;
  }

  /* =====================================================================
     Attestation Centre
     ===================================================================== */
  const centre = { tab: 'all' };
  function centreList(mine) {
    const by = {
      all: mine,
      pending: mine.filter((a) => ['Pending', 'In Progress'].includes(S().statusOf(a))),
      completed: mine.filter((a) => ['Acknowledged', 'Exempted'].includes(S().statusOf(a))),
      overdue: mine.filter((a) => S().statusOf(a) === 'Overdue'),
    };
    const tabs = [['all', 'All Policies'], ['pending', 'Pending'], ['completed', 'Completed'], ['overdue', 'Overdue']];
    const list = sortAssignments(by[centre.tab] || mine);
    return html`<div class="tabs" role="tablist" aria-label="Filter attestations">
        ${tabs.map(([k, l]) => html`<button class="tab ${centre.tab === k ? 'active' : ''}" role="tab" aria-selected="${centre.tab === k}" type="button" data-action="centre-tab" data-tab="${k}">${l}<span class="tab-count">${by[k].length}</span></button>`)}
      </div>
      <div class="att-list" role="tabpanel">${list.length ? list.map(attCard) : WA.emptyState(centre.tab === 'overdue' ? 'Nothing overdue' : centre.tab === 'pending' ? 'You are all caught up' : 'No attestations here', centre.tab === 'pending' ? 'New policy requests will appear here when a campaign is launched.' : '', 'check-circle')}</div>`;
  }
  WA.handle('click', 'centre-tab', (el) => {
    centre.tab = el.dataset.tab;
    WA.setHTML(WA.$('#centre-list'), centreList(S().asgFor(S().user().id)));
    const t = WA.$(`#centre-list [data-tab="${centre.tab}"]`); if (t) t.focus();
  });

  WA.views.attestation = {
    title: 'Attestation Centre',
    perm: 'attest',
    render(params, query) {
      if (query.tab) centre.tab = query.tab;
      const u = S().user();
      const mine = S().asgFor(u.id).filter((a) => a.status !== 'Withdrawn');
      const sum = S().summarize(mine);
      const overdue = mine.filter((a) => S().statusOf(a) === 'Overdue');
      const dueSoon = mine.filter((a) => S().isOpen(a) && S().statusOf(a) !== 'Overdue' && S().daysToDue(a) <= 7).sort((a, b) => (a.due < b.due ? -1 : 1));
      const events = S().state().events.filter((e) => e.employeeId === u.id || (e.actorId === u.id && e.assignmentId)).slice(-8).reverse();
      return html`${WA.crumbs([{ label: 'Policy Attestation' }, { label: 'Attestation Centre' }])}
        <div class="page-head"><div><h1 class="page-title">Attestation Centre</h1><p class="page-sub">Your assigned policies, due dates and receipts. Also available as a Microsoft Teams tab in production (simulated here).</p></div>
          <div class="row"><span class="chip">${icon('user', 14)} ${u.name} · ${u.id}</span><span class="chip">${icon('message', 14)} Teams tab (simulated)</span></div></div>
        ${overdue.length ? html`<div class="overdue-banner" role="alert">${icon('alert', 22)}<div><strong>${WA.plural(overdue.length, 'policy is', 'policies are')} overdue.</strong><div class="small">Overdue items are escalated to your line manager on day 15, the policy owner on day 21 and your department head on day 28 (simulated workflow).</div></div><button class="btn btn-danger-solid btn-sm" type="button" data-action="centre-tab" data-tab="overdue">Show overdue</button></div>` : ''}
        <div class="kpis">
          ${WA.kpi({ label: 'Total assigned', value: sum.total, iconName: 'clipboard-check', sub: `${sum.exempt} exempted` })}
          ${WA.kpi({ label: 'Pending', value: sum.pending, iconName: 'clock', tone: 'warn', sub: `${sum.progress} in progress` })}
          ${WA.kpi({ label: 'Completed', value: sum.ack, iconName: 'check-circle', tone: 'good', sub: sum.late ? `${sum.late} acknowledged late` : 'All on time' })}
          ${WA.kpi({ label: 'Overdue', value: sum.overdue, iconName: 'alert', tone: sum.overdue ? 'bad' : '' })}
          ${WA.kpi({ label: 'Completion', value: WA.fmtPct(sum.rate), iconName: 'percent', bar: sum.rate })}
        </div>
        <div class="grid grid-main">
          <div id="centre-list">${centreList(mine)}</div>
          <div class="stack">
            <section class="card"><div class="card-head"><h3>${icon('bell', 16)} Due soon</h3><span class="sub">Next 7 days</span></div><div class="card-body">
              ${dueSoon.length ? dueSoon.map((a) => html`<div class="news-item"><b><a href="#/read/${a.id}">${S().pol(a.policyId).title}</a></b><span>v${a.version} · due ${fmtDate(a.due)} (${WA.relDays(S().daysToDue(a))})</span></div>`) : html`<p class="muted small" style="margin:0">Nothing due in the next 7 days.</p>`}
            </div></section>
            <section class="card"><div class="card-head"><h3>${icon('history', 16)} Recent attestation activity</h3></div><div class="card-body">
              ${events.length ? html`<ul class="timeline">${events.map((e) => html`<li><span class="tl-dot ${/acknowledged/.test(e.type) ? 'good' : /escal|noncompl/.test(e.type) ? 'bad' : 'info'}">${icon(/acknowledged/.test(e.type) ? 'check' : 'clock', 12)}</span><div class="tl-title">${e.detail}</div><div class="tl-meta">${fmtDateTime(e.ts)}</div></li>`)}</ul>`
                : html`<p class="muted small" style="margin:0">Activity from this demo session (opened, acknowledged, extensions) appears here.</p>`}
            </div></section>
            <section class="card"><div class="card-head"><h3>How attestation works</h3></div><div class="card-body small"><ol class="info-list">
              <li>Open a policy — the reader logs that you opened the exact published version.</li>
              <li>Read for the minimum time and scroll to the end; the acknowledge button then unlocks.</li>
              <li>Tick the confirmation statement and enter your initials.</li>
              <li>Receive an on-screen and emailed receipt; the record is locked.</li>
            </ol></div></section>
          </div>
        </div>`;
    },
  };

  /* =====================================================================
     My Policies — applicable policies and receipts
     ===================================================================== */
  WA.views.myPolicies = {
    title: 'My Policies',
    perm: 'attest',
    render() {
      const u = S().user();
      const mine = S().asgFor(u.id);
      const applicable = S().state().policies.filter((p) => p.status !== 'Draft' && p.versions.length && (p.audience.type === 'all' || p.audience.values.includes(u.deptId)))
        .sort((a, b) => a.id.localeCompare(b.id));
      const receipts = mine.filter((a) => a.status === 'Acknowledged').sort((a, b) => (a.ackAt < b.ackAt ? 1 : -1));
      const row = (p) => {
        const list = mine.filter((a) => a.policyId === p.id);
        const open = list.find((a) => S().isOpen(a));
        const ack = list.filter((a) => a.status === 'Acknowledged').sort((a, b) => (a.ackAt < b.ackAt ? 1 : -1))[0];
        const current = ack && ack.version === p.version;
        let state;
        if (open) state = html`${WA.badge(S().statusOf(open))} <span class="cell-sub">v${open.version} due ${fmtDate(open.due)}</span>`;
        else if (ack) state = html`${WA.badge('Acknowledged')} <span class="cell-sub">v${ack.version} on ${fmtDate(ack.ackAt)}${current ? '' : ' · newer version published'}</span>`;
        else if (!p.attestation) state = html`<span class="badge badge--neutral">For information</span>`;
        else state = html`<span class="badge badge--neutral">Not yet assigned</span>`;
        return html`<tr>
          <td><a class="cell-title" href="#/policy/${p.id}">${p.title}</a><div class="cell-sub">${p.id} · ${S().deptName(p.deptId)}</div></td>
          <td>${p.version}</td><td class="nowrap">${p.effective ? fmtDate(p.effective) : '—'}</td><td>${state}</td>
          <td class="actions">${open ? html`<a class="btn btn-primary btn-sm" href="#/read/${open.id}">Read &amp; Acknowledge</a>` : ack ? html`<a class="btn btn-secondary btn-sm" href="#/receipt/${ack.receipt}">Receipt</a>` : html`<a class="btn btn-ghost btn-sm" href="#/policy/${p.id}">View</a>`}</td>
        </tr>`;
      };
      return html`${WA.crumbs([{ label: 'Policy Attestation' }, { label: 'My Policies' }])}
        <div class="page-head"><div><h1 class="page-title">My Policies</h1><p class="page-sub">Every published policy that applies to you (${S().teamName(u.deptId)}), with your latest acknowledgement and receipts.</p></div></div>
        <div class="table-wrap"><table class="table"><caption class="sr-only">Policies that apply to you</caption>
          <thead><tr><th>Policy</th><th>Version</th><th>Effective</th><th>My status</th><th class="actions">Action</th></tr></thead>
          <tbody>${applicable.map(row)}</tbody></table></div>
        <h2 class="section-title section-title--sm">My receipts</h2>
        ${receipts.length ? html`<div class="table-wrap"><table class="table table--compact"><thead><tr><th>Receipt reference</th><th>Policy</th><th>Version</th><th>Acknowledged</th><th>Channel</th><th class="actions"></th></tr></thead><tbody>
          ${receipts.map((a) => html`<tr><td class="mono">${a.receipt}</td><td>${S().pol(a.policyId).title}</td><td>${a.version}</td><td class="nowrap">${fmtDateTime(a.ackAt)}</td><td>${a.channel}</td>
            <td class="actions"><a class="btn btn-ghost btn-sm" href="#/receipt/${a.receipt}">${icon('eye', 15)} View</a> <button class="btn btn-ghost btn-sm" type="button" data-action="print-receipt" data-ref="${a.receipt}">${icon('printer', 15)} Print</button></td></tr>`)}
          </tbody></table></div>` : WA.emptyState('No receipts yet', 'Acknowledge a policy to receive your first receipt.', 'file-check')}`;
    },
  };

  /* =====================================================================
     Policy Reader & acknowledgement
     ===================================================================== */
  const reader = { aid: null, elapsed: 0, scrolled: false, progress: 0, timer: null, lastTick: 0 };
  function requirementState() {
    const s = S().settings();
    const form = WA.$('#ack-form');
    const confirm = form && form.elements.confirm.checked;
    const initials = form && form.elements.initials.value.trim();
    return { time: reader.elapsed >= s.demoReadSeconds, scrolled: reader.scrolled, confirm: !!confirm, initials: !!initials && initials.length >= 2 };
  }
  function updateReaderUI() {
    const s = S().settings();
    const st = requirementState();
    const left = Math.max(0, Math.ceil(s.demoReadSeconds - reader.elapsed));
    const set = (id, done) => { const li = WA.$(id); if (li) { li.classList.toggle('done', done); li.querySelector('.req-dot').innerHTML = done ? WA.icon('check', 13).s : ''; } };
    set('#req-time', st.time); set('#req-scroll', st.scrolled); set('#req-confirm', st.confirm); set('#req-initials', st.initials);
    const t = WA.$('#timer-left'); if (t) t.textContent = left ? `${left}s` : 'Done';
    const bar = WA.$('#read-progress span'); if (bar) bar.style.width = `${Math.round(reader.progress * 100)}%`;
    const pv = WA.$('#read-progress-val'); if (pv) pv.textContent = `${Math.round(reader.progress * 100)}%`;
    const tb = WA.$('#timer-progress span'); if (tb) tb.style.width = `${Math.min(100, (reader.elapsed / s.demoReadSeconds) * 100)}%`;
    const btn = WA.$('#ack-btn');
    if (btn) {
      const ready = st.time && st.scrolled && st.confirm && st.initials;
      btn.disabled = !ready;
      btn.setAttribute('aria-disabled', String(!ready));
      const hint = WA.$('#ack-hint');
      if (hint) hint.textContent = ready ? 'All conditions met — you can acknowledge.' : !st.time ? 'Keep reading: the minimum reading time has not elapsed.' : !st.scrolled ? 'Scroll to the end of the document.' : !st.confirm ? 'Tick the confirmation statement.' : 'Enter your initials.';
    }
  }
  function onDocScroll(e) {
    const el = e.target;
    const max = el.scrollHeight - el.clientHeight;
    reader.progress = max <= 4 ? 1 : Math.min(1, el.scrollTop / max);
    if (reader.progress >= 0.985) reader.scrolled = true;
    updateReaderUI();
  }

  WA.views.reader = {
    title: 'Policy Reader',
    perm: 'attest',
    render(params) {
      const a = S().asg(params.aid);
      if (!a) return WA.views.notFound.render();
      const p = S().pol(a.policyId);
      this.title = `Read: ${p.title}`;
      const u = S().user();
      const s = S().settings();
      const own = a.employeeId === u.id;
      const crumbs = WA.crumbs([{ label: 'Attestation Centre', href: '#/attestation' }, { label: p.title }]);
      if (!own) {
        return html`${crumbs}${WA.alertBox('info', 'lock', 'This attestation belongs to another employee.', html` It is assigned to ${S().empName(a.employeeId)}. Only the assigned employee can acknowledge it. <a href="#/policy/${p.id}">View the policy document</a>.`)}`;
      }
      if (!S().isOpen(a)) {
        return html`${crumbs}${WA.alertBox('good', 'check-circle', a.status === 'Acknowledged' ? 'Already acknowledged' : `This item is ${a.status.toLowerCase()}`, html` ${a.status === 'Acknowledged' ? html`You acknowledged v${a.version} on ${fmtDateTime(a.ackAt)}. <a href="#/receipt/${a.receipt}">View receipt</a>.` : a.reason || ''}`)}
          <a class="btn btn-secondary" href="#/attestation">${icon('arrow-left', 16)} Back to Attestation Centre</a>`;
      }
      S().openForReading(a.id); // logs 'opened' and moves Pending -> In Progress
      const st = S().statusOf(a);
      const statement = `I confirm that I have read and understood the ${p.title} (version ${a.version}) and agree to comply with it.`;
      return html`${crumbs}
        <div class="page-head" style="margin-top:12px">
          <div><h1 class="page-title">${p.title}</h1>
            <p class="page-sub">${p.id} · Version ${a.version} · Effective ${p.effective ? fmtDate(p.effective, 'long') : '—'} · Owner ${S().empName(p.ownerId)}</p></div>
          <div class="row">${WA.badge(st)} <span class="chip">${icon('clock', 14)} Due ${fmtDate(a.due)} (${WA.relDays(S().daysToDue(a))})</span></div>
        </div>
        ${a.version !== p.version ? WA.alertBox('info', 'layers', `You are attesting to version ${a.version}.`, html` This campaign targets v${a.version}; the library currently shows v${p.version}. The reader displays the exact version assigned to you.`) : ''}
        <div class="reader">
          <div>
            <div class="row row--between small" style="margin-bottom:8px"><span class="muted">Reading progress</span><b id="read-progress-val">0%</b></div>
            <div class="progress" id="read-progress" style="margin-bottom:12px" aria-hidden="true"><span style="width:0%"></span></div>
            <div class="reader-doc" id="reader-doc" tabindex="0" aria-label="Policy document, scroll to read">${WA.vh.documentPaper(p, a.version)}</div>
          </div>
          <aside class="reader-side" aria-label="Acknowledgement">
            <section class="card"><div class="card-head"><h3>Minimum reading time</h3>${WA.simBadge('Demo timer')}</div><div class="card-body">
              <div class="timer-ring"><span class="big" id="timer-left" aria-live="off">${s.demoReadSeconds}s</span><span class="small muted">Demo setting: ${s.demoReadSeconds}s · Production setting for this policy: ${p.minRead} min</span></div>
              <div class="progress" id="timer-progress" style="margin-top:10px"><span style="width:0%"></span></div>
              <p class="small muted" style="margin:10px 0 0">The timer runs only while this tab is visible. It is a simulated control for the demo and is not proof that a document was read.</p>
            </div></section>
            <section class="card"><div class="card-head"><h3>Acknowledgement</h3></div><div class="card-body">
              <ul class="req-list" aria-label="Requirements">
                <li id="req-time"><span class="req-dot"></span><span>Minimum reading time elapsed</span></li>
                <li id="req-scroll"><span class="req-dot"></span><span>Scrolled to the end of the document</span></li>
                <li id="req-confirm"><span class="req-dot"></span><span>Confirmation statement ticked</span></li>
                <li id="req-initials"><span class="req-dot"></span><span>Initials entered</span></li>
              </ul>
              <hr class="hr">
              <form id="ack-form" data-form="acknowledge" data-aid="${a.id}" novalidate>
                <label class="check"><input type="checkbox" name="confirm" data-change="reader-req"><span>${statement}</span></label>
                <div class="field" style="margin-top:14px">
                  <label for="ack-initials">Your initials <span class="req">*</span></label>
                  <input id="ack-initials" class="input initials-input" name="initials" maxlength="4" autocomplete="off" data-input="reader-req" aria-describedby="ack-initials-hint">
                  <span class="hint" id="ack-initials-hint">Must match the signed-in employee: ${WA.initialsOf(u.name)}</span>
                </div>
                <input type="hidden" name="statement" value="${statement}">
                <div class="btn-group" style="margin-top:16px">
                  <button id="ack-btn" class="btn btn-primary btn-lg" type="submit" disabled aria-disabled="true">${icon('file-check', 18)} Acknowledge</button>
                  <a class="btn btn-secondary btn-lg" href="#/attestation">Cancel</a>
                </div>
                <p id="ack-hint" class="small muted" aria-live="polite" style="margin:10px 0 0"></p>
              </form>
            </div></section>
            <section class="card"><div class="card-body small muted">${icon('info', 16)} On acknowledgement the record captures: employee ID, policy ID, version, fingerprint, initials, confirmation statement, a server timestamp (simulated) and a unique receipt reference.</div></section>
          </aside>
        </div>`;
    },
    mount(root, params) {
      const a = S().asg(params.aid);
      if (!a || a.employeeId !== S().user().id || !S().isOpen(a)) return undefined;
      Object.assign(reader, { aid: a.id, elapsed: 0, scrolled: false, progress: 0, lastTick: performance.now() });
      const doc = WA.$('#reader-doc');
      doc.addEventListener('scroll', onDocScroll, { passive: true });
      onDocScroll({ target: doc });
      const total = S().settings().demoReadSeconds;
      reader.timer = setInterval(() => {
        const now = performance.now();
        if (!document.hidden && reader.elapsed < total) reader.elapsed = Math.min(total, reader.elapsed + (now - reader.lastTick) / 1000);
        reader.lastTick = now;
        updateReaderUI();
      }, 250);
      updateReaderUI();
      return () => { clearInterval(reader.timer); reader.timer = null; };
    },
  };
  WA.handle('change', 'reader-req', updateReaderUI);
  WA.handle('input', 'reader-req', (el) => { el.value = el.value.toUpperCase().replace(/[^A-Z]/g, ''); updateReaderUI(); });
  WA.handle('submit', 'acknowledge', (form) => {
    const st = requirementState();
    if (!(st.time && st.scrolled && st.confirm && st.initials)) { WA.toast('Complete all acknowledgement requirements first.', 'warn'); return; }
    try {
      const a = S().acknowledge(form.dataset.aid, { initials: form.elements.initials.value, readSeconds: Math.round(reader.elapsed), channel: 'Portal' });
      WA.app.navigate(`#/receipt/${a.receipt}?new=1`);
    } catch (err) {
      const f = form.elements.initials.closest('.field');
      f.classList.add('invalid');
      let e = f.querySelector('.error-text');
      if (!e) { e = document.createElement('div'); e.className = 'error-text'; f.appendChild(e); }
      e.textContent = err.message;
      form.elements.initials.focus();
    }
  });

  /* =====================================================================
     Receipt
     ===================================================================== */
  function receiptMarkup(a, forPrint) {
    const p = S().pol(a.policyId);
    const e = S().emp(a.employeeId);
    const c = S().camp(a.campaignId);
    const v = p.versions.find((x) => x.version === a.version) || {};
    const statement = `I confirm that I have read and understood the ${p.title} (version ${a.version}) and agree to comply with it.`;
    return html`<div class="receipt ${forPrint ? 'print-doc' : ''}">
      <div class="receipt-head"><div><div class="brandline">WAHA CAPITAL</div><div class="small" style="opacity:.8">Policy attestation receipt — demo</div></div><div class="mono">${a.receipt}</div></div>
      <div class="receipt-body">
        <div class="receipt-ok">${icon('check-circle', 26)}<div><b>Acknowledgement recorded</b><div class="small">${a.outcome === 'Acknowledged late' ? 'Recorded after the due date (late).' : 'Recorded on time.'} The record is locked against edits (simulated).</div></div></div>
        <dl class="kv">
          <dt>Receipt reference</dt><dd class="mono">${a.receipt}</dd>
          <dt>Employee</dt><dd>${e.name} (${e.id})</dd>
          <dt>Department</dt><dd>${S().teamName(e.deptId)}</dd>
          <dt>Policy</dt><dd>${p.id} — ${p.title}</dd>
          <dt>Version</dt><dd>${a.version}</dd>
          <dt>Document fingerprint</dt><dd class="mono">${v.hash || '—'} <span class="muted">(simulated SHA-256)</span></dd>
          <dt>Campaign</dt><dd>${c ? `${c.id} — ${c.name}` : '—'}</dd>
          <dt>Assigned / due</dt><dd>${fmtDate(a.assigned)} / ${fmtDate(a.due)}</dd>
          <dt>Acknowledged</dt><dd>${fmtDateTime(a.ackAt)} <span class="muted">(server timestamp, simulated)</span></dd>
          <dt>Initials</dt><dd>${a.initials}</dd>
          <dt>Channel</dt><dd>${a.channel || 'Portal'}</dd>
          <dt>Confirmation</dt><dd>“${statement}”</dd>
          <dt>Record ID</dt><dd class="mono">${a.id}</dd>
          <dt>Retention</dt><dd>Policy Attestation Record — ${S().settings().retentionYears} years (simulated Microsoft Purview label)</dd>
        </dl>
      </div>
      <div class="receipt-foot">Demo receipt generated from fictional data. In production this receipt is emailed from the shared mailbox and the record is stored in an append-only SharePoint list locked with a Purview retention label.</div>
    </div>`;
  }
  WA.vh.receiptMarkup = receiptMarkup;
  function canSeeReceipt(a) { return a.employeeId === S().user().id || S().can('audit') || S().can('manage'); }
  WA.handle('click', 'print-receipt', (el) => {
    const a = S().byReceipt(el.dataset.ref);
    if (!a || !canSeeReceipt(a)) return;
    WA.printHTML(receiptMarkup(a, true), `Receipt ${a.receipt}`);
  });

  WA.views.receipt = {
    title: 'Receipt',
    render(params, query) {
      const a = S().byReceipt(params.ref);
      if (!a) return WA.views.notFound.render();
      if (!canSeeReceipt(a)) return WA.views.denied.render({ reason: 'Receipts are visible to the employee, policy owners and auditors.' });
      const next = a.employeeId === S().user().id ? S().asgFor(a.employeeId).filter((x) => S().isOpen(x)).sort((x, y) => (x.due < y.due ? -1 : 1))[0] : null;
      const isNew = query.new === '1';
      return html`${WA.crumbs([{ label: 'Attestation Centre', href: S().can('attest') ? '#/attestation' : null }, { label: 'Receipt' }])}
        ${isNew ? html`<div class="page-head" style="justify-content:center;text-align:center"><div><div style="width:64px;height:64px;margin:0 auto 10px;border-radius:50%;background:var(--success-bg);color:var(--success);display:flex;align-items:center;justify-content:center">${icon('check', 34)}</div>
            <h1 class="page-title">Thank you — your acknowledgement is recorded</h1><p class="page-sub" style="margin:6px auto 0">A receipt has been sent to ${S().emp(a.employeeId).email} (simulated email) and your Attestation Centre is updated.</p></div></div>` :
          html`<div class="page-head"><div><h1 class="page-title">Acknowledgement receipt</h1></div></div>`}
        ${receiptMarkup(a)}
        <div class="btn-group" style="justify-content:center;margin-top:20px">
          <button class="btn btn-secondary" type="button" data-action="print-receipt" data-ref="${a.receipt}">${icon('printer', 16)} Print receipt</button>
          ${S().can('attest') ? html`<a class="btn btn-secondary" href="#/attestation">${icon('arrow-left', 16)} Back to Attestation Centre</a>` : ''}
          ${next ? html`<a class="btn btn-primary" href="#/read/${next.id}">Next: ${S().pol(next.policyId).title} ${icon('arrow-right', 16)}</a>` : ''}
        </div>`;
    },
  };
})();
