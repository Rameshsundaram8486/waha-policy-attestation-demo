/* Policy owner: console & register, policy administration, versioning, review/expiry, settings. */
(function () {
  'use strict';
  const WA = window.WA;
  const { html, raw, icon, fmtDate, fmtDateTime } = WA;
  const S = () => WA.svc;
  const APPROVERS = ['Board of Directors', 'Board Risk Committee', 'Board Audit Committee', 'Executive Committee'];

  const ownerCandidates = () => S().state().employees.filter((e) => e.status === 'Active' && /Head|Chief|Manager|Officer$/.test(e.title) && !/Senior .*Officer|Compliance Officer$|Settlements Officer|Investor Services Officer/.test(e.title))
    .sort((a, b) => a.name.localeCompare(b.name));
  const sel = (cond) => (cond ? raw('selected') : '');
  const chk = (cond) => (cond ? raw('checked') : '');

  /* ---------- policy add / edit form ---------- */
  function policyForm(p) {
    const isNew = !p;
    p = p || { title: '', deptId: '', businesses: ['Waha Investments'], ownerId: S().user().id, approver: 'Executive Committee', effective: '', review: WA.addDays(S().today(), 730), attestation: true, regulatory: false, minRead: 10, audience: { type: 'all', values: [] } };
    return html`<form id="policy-form" data-form="policy-save" data-id="${isNew ? '' : p.id}" novalidate>
      <div class="form-grid">
        <div class="field span-2"><label for="pf-title">Policy title <span class="req">*</span></label><input id="pf-title" class="input" name="title" value="${p.title}" maxlength="120"></div>
        <div class="field"><label for="pf-dept">Department <span class="req">*</span></label><select id="pf-dept" class="select" name="deptId"><option value="">Select department</option>${S().state().departments.map((d) => html`<option value="${d.id}" ${sel(p.deptId === d.id)}>${d.name}</option>`)}</select>${isNew ? html`<span class="hint">The policy ID is generated from the department, e.g. RSK.06.</span>` : ''}</div>
        <div class="field"><label for="pf-owner">Document owner <span class="req">*</span></label><select id="pf-owner" class="select" name="ownerId">${ownerCandidates().map((e) => html`<option value="${e.id}" ${sel(p.ownerId === e.id)}>${e.name} — ${e.title}</option>`)}</select></div>
        <div class="field"><label for="pf-approver">Approver <span class="req">*</span></label><select id="pf-approver" class="select" name="approver">${APPROVERS.map((a) => html`<option ${sel(p.approver === a)}>${a}</option>`)}</select></div>
        <div class="field"><label for="pf-min">Minimum reading time (minutes) <span class="req">*</span></label><input id="pf-min" class="input" type="number" min="1" max="60" name="minRead" value="${p.minRead}"></div>
        <div class="field"><label for="pf-eff">Effective date</label><input id="pf-eff" class="input" type="date" name="effective" value="${p.effective || ''}"></div>
        <div class="field"><label for="pf-rev">Review date <span class="req">*</span></label><input id="pf-rev" class="input" type="date" name="review" value="${p.review}"></div>
        <fieldset class="field span-2" style="border:0;padding:0;margin:0"><legend class="label">Business <span class="req">*</span></legend>
          <div class="row">${WA.vh.BIZ.map((b) => html`<label class="check"><input type="checkbox" name="businesses" value="${b.name}" ${chk(p.businesses.includes(b.name))}>${b.name}</label>`)}</div></fieldset>
        <fieldset class="field span-2" style="border:0;padding:0;margin:0"><legend class="label">Audience</legend>
          <div class="row"><label class="check"><input type="radio" name="audType" value="all" ${chk(p.audience.type === 'all')}>All employees</label><label class="check"><input type="radio" name="audType" value="department" ${chk(p.audience.type === 'department')}>Selected departments</label></div>
          <div class="row" style="margin-top:8px">${S().state().departments.map((d) => html`<label class="check"><input type="checkbox" name="audDepts" value="${d.id}" ${chk(p.audience.values.includes(d.id))}>${d.name}</label>`)}</div></fieldset>
        <div class="field span-2"><div class="row"><label class="check"><input type="checkbox" name="attestation" value="1" ${chk(p.attestation)}>Attestation required</label><label class="check"><input type="checkbox" name="regulatory" value="1" ${chk(p.regulatory)}>Regulatory policy</label></div></div>
      </div></form>`;
  }
  function openPolicyForm(id) {
    const p = id ? S().pol(id) : null;
    WA.openOverlay({
      title: p ? `Edit metadata — ${p.id}` : 'Add a policy',
      size: 'lg',
      body: html`${p ? '' : WA.alertBox('info', 'info', '', ' New policies start as draft v1.0. Publish them from the policy page to make them visible in the library.')}${policyForm(p)}`,
      foot: html`<button class="btn btn-secondary" type="button" data-close>Cancel</button><button class="btn btn-primary" type="submit" form="policy-form">${p ? 'Save changes' : 'Create draft policy'}</button>`,
    });
  }
  WA.handle('click', 'policy-add', () => openPolicyForm(null));
  WA.handle('click', 'policy-edit', (el) => openPolicyForm(el.dataset.id));
  WA.handle('submit', 'policy-save', (form) => {
    const d = WA.validateForm(form, {
      title: { required: true, label: 'Policy title', test: (v, all) => (v.length < 5 ? 'Use at least 5 characters.' : S().state().policies.some((p) => p.title.toLowerCase() === v.toLowerCase() && p.id !== form.dataset.id) ? 'A policy with this title already exists.' : null) },
      deptId: { required: true, label: 'Department' },
      ownerId: { required: true, label: 'Document owner' },
      approver: { required: true, label: 'Approver' },
      minRead: { required: true, label: 'Minimum reading time', test: (v) => (Number(v) >= 1 && Number(v) <= 60 ? null : 'Enter between 1 and 60 minutes.') },
      review: { required: true, label: 'Review date', test: (v, all) => ((!form.dataset.id || v !== S().pol(form.dataset.id).review) && v <= S().today() ? 'Review date must be in the future.' : all.effective && v <= all.effective ? 'Review date must be after the effective date.' : null) },
      businesses: { required: true, label: 'At least one business' },
      audDepts: { test: (v, all) => (all.audType === 'department' && !v ? 'Select at least one department.' : null) },
    });
    if (!d) return;
    const payload = {
      title: d.title, deptId: d.deptId, ownerId: d.ownerId, approver: d.approver, minRead: Number(d.minRead), effective: d.effective || null, review: d.review,
      businesses: [].concat(d.businesses), attestation: !!d.attestation, regulatory: !!d.regulatory,
      audience: d.audType === 'department' ? { type: 'department', values: [].concat(d.audDepts || []) } : { type: 'all', values: [] },
    };
    try {
      if (form.dataset.id) {
        const changed = S().updatePolicy(form.dataset.id, payload);
        WA.closeAllOverlays();
        WA.toast(changed.length ? `Saved: ${changed.join(', ')} updated.` : 'No changes to save.', changed.length ? 'good' : 'warn');
        WA.app.refresh();
      } else {
        const p = S().addPolicy(payload);
        WA.closeAllOverlays();
        WA.toast(`${p.id} created as draft v1.0.`);
        WA.app.navigate(`#/console/policy/${p.id}`);
      }
    } catch (err) { WA.toast(err.message, 'bad'); }
  });

  /* ---------- new version ---------- */
  WA.handle('click', 'policy-version', (el) => {
    const p = S().pol(el.dataset.id);
    WA.openOverlay({
      title: `New version — ${p.id} ${p.title}`,
      body: html`<form id="version-form" data-form="version-save" data-id="${p.id}" novalidate><div class="form-grid">
          <fieldset class="field span-2" style="border:0;padding:0;margin:0"><legend class="label">Change type</legend>
            <div class="row"><label class="check"><input type="radio" name="kind" value="major" checked data-change="version-kind" data-id="${p.id}">Major — requires re-attestation</label><label class="check"><input type="radio" name="kind" value="minor" data-change="version-kind" data-id="${p.id}">Minor — no re-attestation</label></div></fieldset>
          <div class="field"><label for="vf-ver">Version number <span class="req">*</span></label><input id="vf-ver" class="input" name="version" value="${S().suggestVersion(p, true)}"><span class="hint">Current published version: ${p.version}</span></div>
          <div class="field"><label for="vf-eff">Effective date</label><input id="vf-eff" class="input" type="date" name="effective" value="${S().today()}"></div>
          <div class="field span-2"><label for="vf-note">Summary of changes <span class="req">*</span></label><textarea id="vf-note" class="textarea" name="note" maxlength="300" placeholder="e.g. Updated escalation thresholds following regulatory guidance"></textarea></div>
          <div class="field span-2"><label for="vf-file">Policy PDF</label><input id="vf-file" class="input" type="file" name="file" accept="application/pdf"><span class="hint">Simulated: only the file name is used; nothing is uploaded or stored. A fingerprint is recorded on publish.</span></div>
          <div class="field span-2"><label class="check"><input type="checkbox" name="regulatory" value="1" ${chk(p.regulatory)}>Flag as regulatory change (suggests a regulatory change campaign)</label></div>
        </div></form>`,
      foot: html`<button class="btn btn-secondary" type="button" data-close>Cancel</button><button class="btn btn-primary" type="submit" form="version-form">${icon('upload', 16)} Save draft version</button>`,
    });
  });
  WA.handle('change', 'version-kind', (el) => {
    const p = S().pol(el.dataset.id);
    const input = el.form.elements.version;
    input.value = S().suggestVersion(p, el.value === 'major');
  });
  WA.handle('submit', 'version-save', (form) => {
    const p = S().pol(form.dataset.id);
    const d = WA.validateForm(form, {
      version: { required: true, label: 'Version number', test: (v) => (!/^\d+\.\d+$/.test(v) ? 'Use the format 4.1 or 5.0.' : S().compareVersions(v, p.version) <= 0 && p.versions.length ? `Must be higher than v${p.version}.` : null) },
      note: { required: true, label: 'Summary of changes', test: (v) => (v.length < 8 ? 'Describe the change in a few words.' : null) },
    });
    if (!d) return;
    const fileInput = form.elements.file;
    const file = fileInput && fileInput.files && fileInput.files[0] ? fileInput.files[0].name : null;
    try {
      S().createVersion(p.id, { version: d.version, note: d.note, major: d.kind === 'major', regulatory: !!d.regulatory, effective: d.effective, file });
      WA.closeAllOverlays();
      WA.toast(`Draft v${d.version} saved. Publish it when approved.`);
      WA.app.navigate(`#/console/policy/${p.id}`);
    } catch (err) { WA.toast(err.message, 'bad'); }
  });

  /* ---------- publish / discard ---------- */
  WA.handle('click', 'policy-publish', async (el) => {
    const p = S().pol(el.dataset.id);
    const v = p.draft ? p.draft.version : p.version;
    const ok = await WA.confirmDialog({ title: `Publish ${p.id} v${v}?`, message: `The published PDF becomes the version employees read and attest to. A fingerprint is recorded and the previous version is kept in history.`, confirmLabel: 'Publish' });
    if (!ok) return;
    const r = S().publishPolicy(p.id);
    WA.toast(`${p.id} v${r.version} published.`);
    WA.app.refresh();
    if (r.major && p.attestation) {
      const go = await WA.confirmDialog({ title: 'Launch re-attestation?', message: `v${r.version} is a major version of a policy that requires attestation. Create a ${r.regulatory ? 'regulatory change' : 'policy update'} campaign now?`, confirmLabel: 'Set up campaign' });
      if (go) WA.app.navigate(`#/campaigns/new?policy=${p.id}&type=${encodeURIComponent(r.regulatory ? 'Regulatory change' : 'Policy update')}`);
    }
  });
  WA.handle('click', 'policy-discard', async (el) => {
    const p = S().pol(el.dataset.id);
    if (!(await WA.confirmDialog({ title: `Discard draft v${p.draft.version}?`, message: 'The draft is removed. Published versions are not affected.', confirmLabel: 'Discard draft', danger: true }))) return;
    S().discardDraft(p.id);
    WA.toast('Draft discarded.');
    WA.app.refresh();
  });

  /* ---------- history ---------- */
  function historyBody(p) {
    const evs = S().state().events.filter((e) => e.policyId === p.id && !e.assignmentId).slice().reverse();
    return html`<h3 style="margin:0 0 8px;font-size:15px">Versions</h3>
      <div class="table-wrap"><table class="table table--compact"><thead><tr><th>Version</th><th>Published</th><th>Change</th><th>Fingerprint (simulated)</th><th>File</th></tr></thead><tbody>
      ${p.versions.slice().reverse().map((v) => html`<tr><td><b>${v.version}</b> ${v.major ? html`<span class="tag">major</span>` : html`<span class="tag">minor</span>`}</td><td class="nowrap">${fmtDate(v.date)}</td><td class="small">${v.note}</td><td class="mono" title="${v.hash}">${v.hash.slice(0, 16)}…</td><td class="small">${v.file}</td></tr>`)}
      ${p.draft ? html`<tr><td><b>${p.draft.version}</b> <span class="badge badge--draft badge--plain">draft</span></td><td>—</td><td class="small">${p.draft.note}</td><td>—</td><td class="small">${p.draft.file || '—'}</td></tr>` : ''}
      </tbody></table></div>
      <h3 style="margin:18px 0 8px;font-size:15px">Policy activity</h3>
      ${evs.length ? html`<ul class="timeline">${evs.map((e) => html`<li><span class="tl-dot info">${icon('history', 12)}</span><div class="tl-title">${e.detail}</div><div class="tl-meta">${fmtDateTime(e.ts)} · ${S().empName(e.actorId)}</div></li>`)}</ul>` : html`<p class="muted small">No recorded activity yet.</p>`}`;
  }
  WA.handle('click', 'policy-history', (el) => {
    const p = S().pol(el.dataset.id);
    WA.openOverlay({ title: `History — ${p.id} ${p.title}`, size: 'lg', drawer: true, body: historyBody(p) });
  });

  /* ---------- review date ---------- */
  WA.handle('click', 'review-date', (el) => {
    const p = S().pol(el.dataset.id);
    WA.openOverlay({
      title: `Configure review date — ${p.id}`, size: 'sm',
      body: html`<form id="review-form" data-form="review-save" data-id="${p.id}" novalidate>
        <p class="small muted" style="margin-top:0">${p.title}. Alerts are sent to the owner 60, 30 and 7 days before this date (simulated).</p>
        <div class="field"><label for="rv-date">Next review date <span class="req">*</span></label><input id="rv-date" class="input" type="date" name="date" value="${p.review}"></div>
        <div class="field" style="margin-top:12px"><label for="rv-note">Reason</label><input id="rv-note" class="input" name="note" maxlength="160" placeholder="e.g. Aligning with regulatory change timetable"></div></form>`,
      foot: html`<button class="btn btn-secondary" type="button" data-close>Cancel</button><button class="btn btn-primary" type="submit" form="review-form">Save review date</button>`,
    });
  });
  WA.handle('submit', 'review-save', (form) => {
    const d = WA.validateForm(form, { date: { required: true, label: 'Review date', test: (v) => (v <= S().today() ? 'Choose a future date.' : null) } });
    if (!d) return;
    S().setReviewDate(form.dataset.id, d.date, d.note);
    WA.closeAllOverlays();
    WA.toast('Review date updated.');
    WA.app.refresh();
  });
  WA.handle('click', 'review-complete', (el) => {
    const p = S().pol(el.dataset.id);
    WA.openOverlay({
      title: `Mark review completed — ${p.id}`, size: 'sm',
      body: html`<form id="review-done-form" data-form="review-done" data-id="${p.id}" novalidate>
        <p class="small muted" style="margin-top:0">${p.title} v${p.version}. Use <b>New version</b> instead if the review resulted in changes.</p>
        <div class="field"><label for="rc-date">Next review date <span class="req">*</span></label><input id="rc-date" class="input" type="date" name="date" value="${WA.addDays(S().today(), 730)}"></div>
        <div class="field" style="margin-top:12px"><label for="rc-note">Review outcome <span class="req">*</span></label><textarea id="rc-note" class="textarea" name="note" maxlength="240">Reviewed — no changes required.</textarea></div></form>`,
      foot: html`<button class="btn btn-secondary" type="button" data-close>Cancel</button><button class="btn btn-primary" type="submit" form="review-done-form">${icon('check', 16)} Complete review</button>`,
    });
  });
  WA.handle('submit', 'review-done', (form) => {
    const d = WA.validateForm(form, { date: { required: true, label: 'Next review date', test: (v) => (v <= S().today() ? 'Choose a future date.' : null) }, note: { required: true, label: 'Review outcome' } });
    if (!d) return;
    S().completeReview(form.dataset.id, d.date, d.note);
    WA.closeAllOverlays();
    WA.toast('Review recorded and next review scheduled.');
    WA.app.refresh();
  });

  /* =====================================================================
     Policy Owner Console
     ===================================================================== */
  const reg = { q: '', dept: '', status: '', review: '', mine: false, page: 1 };
  function filteredRegister() {
    const q = reg.q.toLowerCase();
    const uid = S().user().id;
    return S().state().policies.filter((p) => {
      const ri = S().reviewInfo(p);
      return (!q || `${p.id} ${p.title} ${S().empName(p.ownerId)}`.toLowerCase().includes(q)) &&
        (!reg.dept || p.deptId === reg.dept) && (!reg.status || p.status === reg.status || (reg.status === 'Has draft' && p.draft)) &&
        (!reg.review || (reg.review === 'attention' ? ri.state !== 'Current' : ri.state === reg.review)) && (!reg.mine || p.ownerId === uid);
    }).sort((a, b) => a.id.localeCompare(b.id));
  }
  function registerTable() {
    const list = filteredRegister();
    const pg = WA.paginate(list, reg.page, 12);
    if (!list.length) return WA.emptyState('No policies match these filters', 'Clear a filter or add a new policy.', 'search');
    return html`<div class="table-wrap"><table class="table"><caption class="sr-only">Policy register</caption>
      <thead><tr><th>Policy ID</th><th>Policy title</th><th>Department</th><th>Owner</th><th>Version</th><th>Status</th><th>Effective</th><th>Review</th><th class="actions">Actions</th></tr></thead>
      <tbody>${pg.items.map((p) => {
        const ri = S().reviewInfo(p);
        const canPublish = p.draft || p.status !== 'Published';
        return html`<tr>
          <td class="mono nowrap">${p.id}</td>
          <td><a class="cell-title" href="#/console/policy/${p.id}">${p.title}</a><div class="cell-sub">${p.attestation ? 'Attestation required' : 'No attestation'}${p.regulatory ? ' · Regulatory' : ''}</div></td>
          <td>${S().deptName(p.deptId)}</td><td>${S().empName(p.ownerId)}</td>
          <td class="nowrap">${p.version}${p.draft ? html`<div><span class="badge badge--draft badge--plain">draft v${p.draft.version}</span></div>` : ''}</td>
          <td>${WA.badge(p.status)}</td>
          <td class="nowrap">${p.effective ? fmtDate(p.effective) : '—'}</td>
          <td class="nowrap">${fmtDate(p.review)}<div>${ri.state !== 'Current' ? WA.badge(ri.state) : ''}</div></td>
          <td class="actions">
            <a class="btn btn-ghost btn-sm" href="#/console/policy/${p.id}" title="View policy" aria-label="View ${p.id}">${icon('eye', 16)}</a>
            <button class="btn btn-ghost btn-sm" type="button" data-action="policy-edit" data-id="${p.id}" title="Edit metadata" aria-label="Edit ${p.id} metadata">${icon('pencil', 16)}</button>
            <button class="btn btn-ghost btn-sm" type="button" data-action="policy-version" data-id="${p.id}" title="Create new version" aria-label="Create new version of ${p.id}">${icon('layers', 16)}</button>
            <button class="btn btn-ghost btn-sm" type="button" data-action="policy-publish" data-id="${p.id}" title="${canPublish ? 'Publish' : 'Already published'}" aria-label="Publish ${p.id}" ${canPublish ? '' : raw('disabled')}>${icon('upload', 16)}</button>
            <button class="btn btn-ghost btn-sm" type="button" data-action="review-date" data-id="${p.id}" title="Configure review date" aria-label="Configure review date for ${p.id}">${icon('calendar', 16)}</button>
            <button class="btn btn-ghost btn-sm" type="button" data-action="policy-history" data-id="${p.id}" title="View history" aria-label="View history of ${p.id}">${icon('history', 16)}</button>
          </td></tr>`;
      })}</tbody></table></div>${WA.pager(pg, 'reg-page')}`;
  }
  const refreshReg = () => WA.setHTML(WA.$('#register'), registerTable());
  WA.handle('input', 'reg-q', WA.debounce((el) => { reg.q = el.value; reg.page = 1; refreshReg(); }, 150));
  WA.handle('change', 'reg-filter', (el) => { reg[el.name] = el.type === 'checkbox' ? el.checked : el.value; reg.page = 1; refreshReg(); });
  WA.handle('click', 'reg-page', (el) => { reg.page = Number(el.dataset.page); refreshReg(); });

  function settingsPanel() {
    const s = S().settings();
    const leaverPool = S().activeEmployees().filter((e) => !Object.values(WA.data.PERSONAS).some((p) => p.userId === e.id)).slice(0, 400);
    return html`<div class="grid grid-3" id="settings">
      <section class="card"><div class="card-head"><h3>${icon('sliders', 16)} Workflow configuration</h3><span class="sub">No code required</span></div><div class="card-body">
        <form id="settings-form" data-form="settings-save" novalidate class="stack">
          <div class="field"><label for="st-window">Attestation window (days)</label><input id="st-window" class="input" type="number" min="3" max="60" name="windowDays" value="${s.windowDays}"></div>
          <div class="field"><label for="st-rem">Reminder days</label><input id="st-rem" class="input" name="reminderDays" value="${s.reminderDays.join(', ')}"><span class="hint">Comma-separated, each before the window ends.</span></div>
          <div class="field"><label for="st-esc">Escalation days (stages 1, 2, 3)</label><input id="st-esc" class="input" name="escalationDays" value="${s.escalationDays.join(', ')}"></div>
          <div class="field"><label for="st-week">Repeat reminder after stage 3 (days)</label><input id="st-week" class="input" type="number" min="1" max="30" name="weeklyAfterDays" value="${s.weeklyAfterDays}"></div>
          <div class="field"><label for="st-read">Demo reading timer (seconds)</label><input id="st-read" class="input" type="number" min="3" max="120" name="demoReadSeconds" value="${s.demoReadSeconds}"><span class="hint">Simulated minimum reading time used by the policy reader.</span></div>
          <button class="btn btn-primary" type="submit">Save configuration</button>
        </form></div></section>
      <section class="card"><div class="card-head"><h3>${icon('users', 16)} Identity sync</h3>${WA.simBadge('Entra ID')}</div><div class="card-body stack">
        <p class="small muted" style="margin:0">In production a scheduled flow reads Entra ID for joiners and leavers. Here you can trigger the same outcomes.</p>
        <button class="btn btn-secondary" type="button" data-action="sim-joiner">${icon('user-plus', 16)} Simulate a new joiner</button>
        <form data-form="sim-leaver" class="stack" novalidate>
          <div class="field"><label for="lv-emp">Simulate a leaver</label><select id="lv-emp" class="select" name="emp"><option value="">Select employee</option>${leaverPool.map((e) => html`<option value="${e.id}">${e.name} (${e.id}) — ${S().teamName(e.deptId)}</option>`)}</select></div>
          <button class="btn btn-secondary" type="submit">${icon('user-x', 16)} Mark as leaver</button>
        </form></div></section>
      <section class="card"><div class="card-head"><h3>${icon('archive', 16)} Demo data</h3></div><div class="card-body stack">
        <p class="small" style="margin:0">All data is fictional and stored only in this browser (${(WA.storage.size() / 1024).toFixed(0)} KB in LocalStorage${WA.storage.isAvailable() ? '' : ' — unavailable, changes are not saved'}).</p>
        <p class="small muted" style="margin:0">${S().state().employees.length} employees · ${S().state().policies.length} policies · ${S().state().campaigns.length} campaigns · ${S().state().assignments.length.toLocaleString('en-GB')} assignments · ${S().state().events.length.toLocaleString('en-GB')} events</p>
        <button class="btn btn-danger" type="button" data-action="reset-demo">${icon('reset', 16)} Reset demo data</button>
      </div></section></div>`;
  }
  function parseDays(v) { return String(v).split(/[,\s]+/).filter(Boolean).map(Number); }
  WA.handle('submit', 'settings-save', (form) => {
    const d = WA.validateForm(form, {
      windowDays: { required: true, label: 'Window', test: (v) => (Number(v) >= 3 && Number(v) <= 60 ? null : 'Use 3–60 days.') },
      reminderDays: { required: true, label: 'Reminder days', test: (v, all) => { const a = parseDays(v); return a.some(isNaN) || a.some((x) => x < 1 || x >= Number(all.windowDays)) ? 'Each reminder must be a whole day inside the window.' : null; } },
      escalationDays: { required: true, label: 'Escalation days', test: (v, all) => { const a = parseDays(v); return a.length !== 3 || a.some(isNaN) ? 'Enter exactly three days.' : a.some((x) => x <= Number(all.windowDays)) || !(a[0] < a[1] && a[1] < a[2]) ? 'Stages must be after the window and in ascending order.' : null; } },
      weeklyAfterDays: { required: true, label: 'Repeat interval', test: (v) => (Number(v) >= 1 && Number(v) <= 30 ? null : 'Use 1–30 days.') },
      demoReadSeconds: { required: true, label: 'Reading timer', test: (v) => (Number(v) >= 3 && Number(v) <= 120 ? null : 'Use 3–120 seconds.') },
    });
    if (!d) return;
    if (!S().can('manage')) { WA.toast('Read-only persona.', 'bad'); return; }
    Object.assign(S().settings(), { windowDays: Number(d.windowDays), reminderDays: parseDays(d.reminderDays).sort((a, b) => a - b), escalationDays: parseDays(d.escalationDays), weeklyAfterDays: Number(d.weeklyAfterDays), demoReadSeconds: Number(d.demoReadSeconds) });
    S().logEvent('settings.updated', `Workflow configuration updated: window ${d.windowDays}d, reminders ${d.reminderDays}, escalations ${d.escalationDays}`, {});
    S().persist();
    WA.toast('Workflow configuration saved. Day counts apply to all open items.');
    WA.app.refresh();
  });
  WA.handle('click', 'sim-joiner', () => {
    try {
      const r = S().simulateNewJoiner();
      WA.toast(`New joiner ${r.employee.name} detected (simulated); ${r.created} policies assigned.`);
      WA.app.refresh();
    } catch (err) { WA.toast(err.message, 'bad'); }
  });
  WA.handle('submit', 'sim-leaver', async (form) => {
    const id = form.elements.emp.value;
    if (!id) { WA.toast('Select an employee first.', 'warn'); return; }
    const e = S().emp(id);
    if (!(await WA.confirmDialog({ title: `Mark ${e.name} as a leaver?`, message: 'Open assignments are withdrawn and the employee is excluded from new campaigns. Completed records are retained.', confirmLabel: 'Mark as leaver' }))) return;
    try { const n = S().simulateLeaver(id); WA.toast(`${e.name} marked as leaver; ${n} open assignments withdrawn.`); WA.app.refresh(); } catch (err) { WA.toast(err.message, 'bad'); }
  });

  WA.views.console = {
    title: 'Policy Owner Console',
    perm: 'manage',
    render(params, query) {
      if (query.review) reg.review = query.review;
      const st = S().state();
      const activeC = st.campaigns.filter((c) => c.status === 'Active');
      const activeA = st.assignments.filter((a) => activeC.some((c) => c.id === a.campaignId));
      const sum = S().summarize(activeA);
      const needReview = st.policies.filter((p) => S().reviewInfo(p).state !== 'Current' || p.status === 'Under Review').length;
      return html`${WA.crumbs([{ label: 'Policy Management' }, { label: 'Policy Owner Console' }])}
        <div class="page-head"><div><h1 class="page-title">Policy Owner Console</h1><p class="page-sub">Policy register, versions and publishing, review dates, workflow configuration and demo data.</p></div>
          <div class="btn-group"><a class="btn btn-secondary" href="#/campaigns/new">${icon('megaphone', 16)} New campaign</a><button class="btn btn-primary" type="button" data-action="policy-add">${icon('plus', 16)} Add policy</button></div></div>
        <div class="kpis">
          ${WA.kpi({ label: 'Total policies', value: st.policies.length, iconName: 'file' })}
          ${WA.kpi({ label: 'Published', value: st.policies.filter((p) => p.status === 'Published').length, iconName: 'check-circle', tone: 'good', sub: `${st.policies.filter((p) => p.draft || p.status === 'Draft').length} with drafts` })}
          ${WA.kpi({ label: 'Requiring review', value: needReview, iconName: 'calendar', tone: 'warn', sub: html`<a href="#/reviews">Review &amp; expiry →</a>` })}
          ${WA.kpi({ label: 'Active campaigns', value: activeC.length, iconName: 'megaphone' })}
          ${WA.kpi({ label: 'Assigned employees', value: new Set(activeA.map((a) => a.employeeId)).size, iconName: 'users', sub: `${activeA.length.toLocaleString('en-GB')} assignments` })}
          ${WA.kpi({ label: 'Completion rate', value: WA.fmtPct(sum.rate), iconName: 'percent', bar: sum.rate, sub: 'Active campaigns' })}
          ${WA.kpi({ label: 'Overdue', value: sum.overdue, iconName: 'alert', tone: 'bad', sub: html`<a href="#/notifications">Escalation queue →</a>` })}
        </div>
        <div class="section-row"><h2 class="section-title section-title--sm" style="margin-top:6px">Policy register</h2></div>
        <div class="toolbar" role="search">
          <div class="field field--grow"><label for="reg-q">Search</label><input id="reg-q" class="input" type="search" placeholder="ID, title or owner" value="${reg.q}" data-input="reg-q"></div>
          <div class="field"><label for="reg-dept">Department</label><select id="reg-dept" class="select" name="dept" data-change="reg-filter"><option value="">All</option>${st.departments.map((d) => html`<option value="${d.id}" ${sel(reg.dept === d.id)}>${d.name}</option>`)}</select></div>
          <div class="field"><label for="reg-status">Status</label><select id="reg-status" class="select" name="status" data-change="reg-filter"><option value="">All</option>${['Published', 'Under Review', 'Draft', 'Has draft'].map((s) => html`<option ${sel(reg.status === s)}>${s}</option>`)}</select></div>
          <div class="field"><label for="reg-review">Review</label><select id="reg-review" class="select" name="review" data-change="reg-filter"><option value="">All</option><option value="attention" ${sel(reg.review === 'attention')}>Needs attention</option>${['Review overdue', 'Due in 7 days', 'Due in 30 days', 'Due in 60 days', 'Current'].map((s) => html`<option ${sel(reg.review === s)}>${s}</option>`)}</select></div>
          <label class="check" style="align-self:center"><input type="checkbox" name="mine" data-change="reg-filter" ${chk(reg.mine)}>Owned by me</label>
        </div>
        <div id="register">${registerTable()}</div>
        <h2 class="section-title section-title--sm">Configuration &amp; demo administration</h2>
        ${settingsPanel()}`;
    },
  };

  /* =====================================================================
     Policy administration page
     ===================================================================== */
  WA.views.policyAdmin = {
    title: 'Policy',
    perm: 'manage',
    render(params) {
      const p = S().pol(params.id);
      if (!p) return WA.views.notFound.render();
      this.title = `${p.id} ${p.title}`;
      const ri = S().reviewInfo(p);
      const list = S().asgByPol(p.id);
      const byCamp = WA.uniq(list.map((a) => a.campaignId)).map((cid) => ({ c: S().camp(cid), s: S().summarize(list.filter((a) => a.campaignId === cid)), ver: list.find((a) => a.campaignId === cid).version }));
      const evs = S().state().events.filter((e) => e.policyId === p.id && !e.assignmentId).slice(-12).reverse();
      const canPublish = p.draft || p.status !== 'Published';
      return html`${WA.crumbs([{ label: 'Policy Owner Console', href: '#/console' }, { label: `${p.id} ${p.title}` }])}
        <div class="page-head"><div><h1 class="page-title">${p.title}</h1><p class="page-sub">${p.id} · v${p.version} · ${S().deptName(p.deptId)} · Owner ${S().empName(p.ownerId)}</p>
          <div class="row" style="margin-top:10px">${WA.badge(p.status)} ${WA.badge(ri.state)} ${p.attestation ? html`<span class="badge badge--teal">Attestation required</span>` : ''} ${p.regulatory ? html`<span class="badge badge--progress badge--plain">Regulatory</span>` : ''}</div></div>
          <div class="btn-group">
            ${p.versions.length ? html`<a class="btn btn-secondary btn-sm" href="#/policy/${p.id}">${icon('eye', 15)} View policy</a>` : ''}
            <button class="btn btn-secondary btn-sm" type="button" data-action="policy-edit" data-id="${p.id}">${icon('pencil', 15)} Edit metadata</button>
            <button class="btn btn-secondary btn-sm" type="button" data-action="policy-version" data-id="${p.id}">${icon('layers', 15)} New version</button>
            <button class="btn btn-secondary btn-sm" type="button" data-action="review-date" data-id="${p.id}">${icon('calendar', 15)} Review date</button>
            <button class="btn btn-secondary btn-sm" type="button" data-action="policy-history" data-id="${p.id}">${icon('history', 15)} History</button>
            ${canPublish ? html`<button class="btn btn-primary btn-sm" type="button" data-action="policy-publish" data-id="${p.id}">${icon('upload', 15)} Publish${p.draft ? ` v${p.draft.version}` : ''}</button>` : ''}
          </div></div>
        ${p.draft ? html`<div class="alert alert--sim">${icon('layers', 20)}<div><strong>Draft v${p.draft.version} awaiting publication</strong> ${p.draft.major ? 'Major' : 'Minor'} change${p.draft.regulatory ? ' · regulatory' : ''} — “${p.draft.note}”. Uploaded ${fmtDate(p.draft.date)}${p.draft.file ? ` · ${p.draft.file}` : ''}.</div>
            <div class="btn-group" style="margin-left:auto"><button class="btn btn-secondary btn-sm" type="button" data-action="policy-discard" data-id="${p.id}">Discard</button><button class="btn btn-primary btn-sm" type="button" data-action="policy-publish" data-id="${p.id}">Publish</button></div></div>` : ''}
        ${ri.state !== 'Current' ? WA.alertBox(ri.lapsed ? 'bad' : 'warn', 'calendar', ri.lapsed ? `Review overdue by ${-ri.days} days` : `Review due ${WA.relDays(ri.days)}`, html` Scheduled for ${fmtDate(p.review, 'long')}. <button class="link-btn" type="button" data-action="review-complete" data-id="${p.id}">Mark review completed</button>`) : ''}
        <div class="grid grid-2">
          <section class="card"><div class="card-head"><h3>Metadata</h3></div><div class="card-body"><dl class="kv">
            <dt>Policy ID</dt><dd>${p.id}</dd><dt>Title</dt><dd>${p.title}</dd><dt>Business</dt><dd>${p.businesses.join(', ')}</dd>
            <dt>Department</dt><dd>${S().deptName(p.deptId)}</dd><dt>Owner</dt><dd>${S().empName(p.ownerId)}</dd><dt>Approver</dt><dd>${p.approver}</dd>
            <dt>Created / uploaded</dt><dd>${fmtDate(p.created)} / ${fmtDate(p.uploaded)}</dd><dt>Effective</dt><dd>${p.effective ? fmtDate(p.effective) : '—'}</dd>
            <dt>Review</dt><dd>${fmtDate(p.review)} (last reviewed ${fmtDate(p.lastReviewed)})</dd><dt>Audience</dt><dd>${S().audienceLabel(p.audience)}</dd>
            <dt>Min. reading time</dt><dd>${p.minRead} min (production)</dd>
          </dl></div></section>
          <section class="card"><div class="card-head"><h3>Version history</h3><button class="btn btn-ghost btn-sm" type="button" data-action="policy-history" data-id="${p.id}">Full history</button></div><div class="card-body card-body--flush">
            ${p.versions.length ? html`<table class="table table--compact"><thead><tr><th>Version</th><th>Published</th><th>Fingerprint (simulated)</th></tr></thead><tbody>
            ${p.versions.slice().reverse().map((v) => html`<tr><td><b>${v.version}</b> <span class="tag">${v.major ? 'major' : 'minor'}</span><div class="cell-sub">${v.note}</div></td><td class="nowrap">${fmtDate(v.date)}</td><td class="mono" title="${v.hash}">${v.hash.slice(0, 16)}…</td></tr>`)}</tbody></table>` : WA.emptyState('Not yet published', 'Publish the draft to create the first version.', 'layers')}
          </div></section>
        </div>
        <h2 class="section-title section-title--sm">Attestation coverage</h2>
        ${byCamp.length ? html`<div class="table-wrap"><table class="table"><thead><tr><th>Campaign</th><th>Version</th><th class="num">Assigned</th><th class="num">Completed</th><th class="num">Overdue</th><th>Completion</th></tr></thead><tbody>
          ${byCamp.map(({ c, s, ver }) => html`<tr><td><a href="#/campaigns/${c.id}">${c.name}</a><div class="cell-sub">${c.id} · ${c.status}</div></td><td>${ver}</td><td class="num">${s.total}</td><td class="num">${s.ack}</td><td class="num">${s.overdue}</td><td>${WA.meter(s.rate)}</td></tr>`)}
          </tbody></table></div>` : html`<p class="muted">No campaigns have assigned this policy yet. <a href="#/campaigns/new?policy=${p.id}">Create a campaign</a>.</p>`}
        <h2 class="section-title section-title--sm">Activity history</h2>
        ${evs.length ? html`<ul class="timeline">${evs.map((e) => html`<li><span class="tl-dot info">${icon('history', 12)}</span><div class="tl-title">${e.detail}</div><div class="tl-meta">${fmtDateTime(e.ts)} · ${S().empName(e.actorId)}</div></li>`)}</ul>` : html`<p class="muted">No activity recorded.</p>`}`;
    },
  };

  /* =====================================================================
     Review & Expiry alerts
     ===================================================================== */
  const rv = { scope: 'attention' };
  WA.handle('change', 'rv-scope', (el) => { rv.scope = el.value; WA.app.refresh(); });
  WA.views.reviews = {
    title: 'Review & Expiry',
    perm: 'manage',
    render() {
      const all = S().state().policies.map((p) => ({ p, ri: S().reviewInfo(p) })).sort((a, b) => a.ri.days - b.ri.days);
      const count = (s) => all.filter((x) => x.ri.state === s).length;
      const list = rv.scope === 'attention' ? all.filter((x) => x.ri.state !== 'Current') : all;
      return html`${WA.crumbs([{ label: 'Policy Management' }, { label: 'Review & Expiry' }])}
        <div class="page-head"><div><h1 class="page-title">Policy review &amp; expiry alerts</h1><p class="page-sub">Owners are alerted 60, 30 and 7 days before each review date and again if a policy lapses. Alerts are simulated from the fixed demo date (${fmtDate(S().today(), 'long')}).</p></div></div>
        <div class="kpis">
          ${WA.kpi({ label: 'Review overdue', value: count('Review overdue'), iconName: 'alert', tone: 'bad', sub: 'Lapsed policies' })}
          ${WA.kpi({ label: 'Due within 7 days', value: count('Due in 7 days'), iconName: 'clock', tone: 'bad' })}
          ${WA.kpi({ label: 'Due within 30 days', value: count('Due in 30 days'), iconName: 'calendar', tone: 'warn' })}
          ${WA.kpi({ label: 'Due within 60 days', value: count('Due in 60 days'), iconName: 'calendar' })}
          ${WA.kpi({ label: 'Current', value: count('Current'), iconName: 'check-circle', tone: 'good' })}
        </div>
        <div class="toolbar"><div class="field" style="max-width:280px"><label for="rv-scope">Show</label><select id="rv-scope" class="select" data-change="rv-scope"><option value="attention" ${sel(rv.scope === 'attention')}>Needs attention (≤ 60 days or overdue)</option><option value="all" ${sel(rv.scope === 'all')}>All policies</option></select></div></div>
        ${list.length ? html`<div class="table-wrap"><table class="table"><caption class="sr-only">Policy reviews</caption><thead><tr><th>Policy</th><th>Owner</th><th>Review date</th><th>Status</th><th>Alerts (60 / 30 / 7 days)</th><th>Last reviewed</th><th class="actions">Actions</th></tr></thead><tbody>
          ${list.map(({ p, ri }) => html`<tr>
            <td><a class="cell-title" href="#/console/policy/${p.id}">${p.title}</a><div class="cell-sub">${p.id} · v${p.version} · ${WA.badge(p.status)}</div></td>
            <td>${S().empName(p.ownerId)}</td>
            <td class="nowrap">${fmtDate(p.review)}<div class="cell-sub">${ri.lapsed ? `${-ri.days} days overdue` : WA.relDays(ri.days)}</div></td>
            <td>${WA.badge(ri.state)}</td>
            <td class="nowrap">${ri.alerts.map((a) => html`<span class="badge ${a.sent ? 'badge--sim' : 'badge--neutral'} badge--plain" title="${a.sent ? 'Sent' : 'Scheduled'} ${fmtDate(a.date)}" style="margin-right:4px">${a.sent ? icon('check', 11) : icon('clock', 11)} ${a.n}d</span>`)}${ri.lapsed ? html`<span class="badge badge--overdue badge--plain">${icon('alert', 11)} lapsed</span>` : ''}</td>
            <td class="nowrap">${fmtDate(p.lastReviewed)}</td>
            <td class="actions"><button class="btn btn-secondary btn-sm" type="button" data-action="review-date" data-id="${p.id}">${icon('calendar', 14)} Update date</button> <button class="btn btn-primary btn-sm" type="button" data-action="review-complete" data-id="${p.id}">${icon('check', 14)} Mark reviewed</button></td>
          </tr>`)}</tbody></table></div>` : WA.emptyState('No reviews need attention', 'All policies are more than 60 days from their review date.', 'check-circle')}`;
    },
  };
})();
