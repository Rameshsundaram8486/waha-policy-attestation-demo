/* Reporting dashboard, audit evidence (read-only) and line manager dashboard. */
(function () {
  'use strict';
  const WA = window.WA;
  const { html, raw, icon, fmtDate, fmtDateTime } = WA;
  const S = () => WA.svc;
  const sel = (c) => (c ? raw('selected') : '');

  /* ---------- shared export helpers ---------- */
  const COLUMNS = [
    { label: 'Record ID', value: 'id' },
    { label: 'Employee ID', value: 'employeeId' },
    { label: 'Employee', value: (a) => S().empName(a.employeeId) },
    { label: 'Department', value: (a) => S().teamName(S().emp(a.employeeId).deptId) },
    { label: 'Line manager', value: (a) => (S().lineManagerOf(a.employeeId) || {}).name || '' },
    { label: 'Policy ID', value: 'policyId' },
    { label: 'Policy', value: (a) => S().pol(a.policyId).title },
    { label: 'Version', value: 'version' },
    { label: 'Campaign ID', value: 'campaignId' },
    { label: 'Assigned', value: 'assigned' },
    { label: 'Due', value: 'due' },
    { label: 'Status', value: (a) => S().statusOf(a) },
    { label: 'Escalation stage', value: (a) => S().escStage(a) || '' },
    { label: 'Opened (UTC)', value: (a) => a.openedAt || '' },
    { label: 'Acknowledged (UTC)', value: (a) => a.ackAt || '' },
    { label: 'Receipt reference', value: (a) => a.receipt || '' },
    { label: 'Initials', value: (a) => a.initials || '' },
    { label: 'Channel', value: (a) => a.channel || '' },
    { label: 'Outcome', value: (a) => a.outcome || '' },
    { label: 'Exception reason', value: (a) => a.reason || '' },
  ];
  const assignmentCSV = (list) => WA.toCSV(list, COLUMNS) + `\r\n\r\n"DEMO DATA — fictional records exported ${S().demoNow()} from the Policy Attestation prototype. Not Waha Capital data."`;
  function evidenceReport(title, list, lines) {
    const MAX = 400;
    const rows = list.slice(0, MAX);
    return html`<div class="print-doc">
      <h1>${title}</h1>
      <div class="print-meta">Generated ${fmtDateTime(S().demoNow())} by ${S().user().name} (${S().persona().label}) · ${list.length.toLocaleString('en-GB')} records${list.length > MAX ? ` (first ${MAX} shown — export CSV for the full set)` : ''}<br>
        ${(lines || []).map((l) => html`${l}<br>`)}
        <b>DEMO ENVIRONMENT — all data is fictional.</b> Record locking and Purview retention are simulated in this prototype.</div>
      <table><thead><tr><th>Record</th><th>Employee</th><th>Policy</th><th>Ver.</th><th>Campaign</th><th>Status</th><th>Timestamp (GST)</th><th>Receipt</th><th>Outcome / reason</th></tr></thead><tbody>
      ${rows.map((a) => html`<tr><td>${a.id}</td><td>${S().empName(a.employeeId)}<br>${a.employeeId}</td><td>${a.policyId}</td><td>${a.version}</td><td>${a.campaignId}</td><td>${S().statusOf(a)}</td><td>${a.ackAt ? fmtDateTime(a.ackAt) : a.closedAt ? fmtDateTime(a.closedAt) : '—'}</td><td>${a.receipt || '—'}</td><td>${a.outcome || '—'}${a.reason ? ` — ${a.reason}` : ''}</td></tr>`)}
      </tbody></table>
      <p class="print-note">In production the evidence pack is generated from the append-only SharePoint attestation log, whose items carry a Microsoft Purview retention label (record). Verification of immutability must be performed in the Microsoft 365 tenant.</p></div>`;
  }
  WA.insights = { assignmentCSV, evidenceReport };

  /* =====================================================================
     Reporting dashboard
     ===================================================================== */
  const rp = { from: '', to: '', campaign: '', dept: '', q: '' };
  function reportData() {
    const q = rp.q.toLowerCase();
    return S().state().assignments.filter((a) => {
      if (a.status === 'Withdrawn') return false;
      if (rp.campaign && a.campaignId !== rp.campaign) return false;
      if (rp.from && a.assigned < rp.from) return false;
      if (rp.to && a.assigned > rp.to) return false;
      const e = S().emp(a.employeeId);
      if (rp.dept && e.deptId !== rp.dept) return false;
      if (q && !`${e.name} ${e.id} ${a.policyId} ${S().pol(a.policyId).title}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }
  function reportBody() {
    const list = reportData();
    const st = S().state();
    const sum = S().summarize(list);
    const camps = st.campaigns.filter((c) => list.some((a) => a.campaignId === c.id));
    const depts = st.departments.filter((d) => list.some((a) => S().emp(a.employeeId).deptId === d.id));
    const by = (arr, keyFn) => { const m = new Map(); arr.forEach((a) => { const k = keyFn(a); if (!m.has(k)) m.set(k, []); m.get(k).push(a); }); return m; };
    const byCamp = by(list, (a) => a.campaignId);
    const byDept = by(list, (a) => S().emp(a.employeeId).deptId);
    const short = (n) => (n.length > 30 ? n.slice(0, 28) + '…' : n);
    const campLabels = camps.map((c) => short(c.name));
    const deptLabels = depts.map((d) => d.team);
    const campSum = camps.map((c) => S().summarize(byCamp.get(c.id) || []));
    const deptSum = depts.map((d) => S().summarize(byDept.get(d.id) || []));
    const STATUS = ['Acknowledged', 'In Progress', 'Pending', 'Overdue', 'Non-compliant', 'Exempted'];
    const statusCounts = STATUS.map((s) => list.filter((a) => S().statusOf(a) === s).length);
    const overdueRows = list.filter((a) => S().statusOf(a) === 'Overdue').sort((a, b) => S().escStage(b) - S().escStage(a) || (a.due < b.due ? -1 : 1));
    if (!list.length) return WA.emptyState('No attestation records match these filters', 'Widen the date range or clear the filters.', 'filter');
    const C = WA.STATUS_COLORS;
    return html`<div class="kpis">
        ${WA.kpi({ label: 'Total policies', value: st.policies.filter((p) => p.status === 'Published').length, iconName: 'file', sub: `${st.policies.length} in register` })}
        ${WA.kpi({ label: 'Active campaigns', value: st.campaigns.filter((c) => c.status === 'Active').length, iconName: 'megaphone' })}
        ${WA.kpi({ label: 'Assigned attestations', value: sum.total.toLocaleString('en-GB'), iconName: 'clipboard-check', sub: `${new Set(list.map((a) => a.employeeId)).size} employees` })}
        ${WA.kpi({ label: 'Completed', value: sum.ack.toLocaleString('en-GB'), iconName: 'check-circle', tone: 'good', sub: `${sum.late} late` })}
        ${WA.kpi({ label: 'Pending', value: sum.pending.toLocaleString('en-GB'), iconName: 'clock', tone: 'warn', sub: `${sum.progress} in progress` })}
        ${WA.kpi({ label: 'Overdue', value: sum.overdue.toLocaleString('en-GB'), iconName: 'alert', tone: 'bad' })}
        ${WA.kpi({ label: 'Overall completion', value: WA.fmtPct(sum.rate), iconName: 'percent', bar: sum.rate, sub: `${sum.exempt} exempted excluded` })}
      </div>
      <div class="grid grid-2">
        ${WA.chartCard({ id: 'ch-camp', title: 'Completion by campaign', sub: 'Acknowledged ÷ applicable assignments', type: 'hbar', percent: true, axisLabel: 'Campaign', labels: campLabels, datasets: [{ label: 'Completion', data: campSum.map((s) => s.rate), color: '#00838a' }] })}
        ${WA.chartCard({ id: 'ch-dept', title: 'Completion by department', sub: 'Acknowledged ÷ applicable assignments', type: 'hbar', percent: true, axisLabel: 'Department', labels: deptLabels, datasets: [{ label: 'Completion', data: deptSum.map((s) => s.rate), color: '#00838a' }] })}
        ${WA.chartCard({ id: 'ch-pvc', title: 'Pending versus completed', sub: 'Assignments by campaign', type: 'stacked', axisLabel: 'Campaign', labels: campLabels, datasets: [
          { label: 'Completed', data: campSum.map((s) => s.ack), color: C.Acknowledged },
          { label: 'Pending', data: campSum.map((s) => s.pending), color: C.Pending },
          { label: 'Overdue', data: campSum.map((s) => s.overdue), color: C.Overdue },
        ] })}
        ${WA.chartCard({ id: 'ch-over', title: 'Overdue acknowledgements by department', sub: 'Open items past their due date', type: 'bar', axisLabel: 'Department', labels: deptLabels, datasets: [{ label: 'Overdue', data: deptSum.map((s) => s.overdue), color: C.Overdue }] })}
      </div>
      <div class="grid grid-main" style="margin-top:16px">
        ${WA.chartCard({ id: 'ch-status', title: 'Attestation status distribution', sub: 'All assignments in the current filter', type: 'bar', axisLabel: 'Status', labels: STATUS, datasets: [{ label: 'Assignments', data: statusCounts, color: STATUS.map((s) => C[s]) }] })}
        <section class="card"><div class="card-head"><h3>Overdue register</h3><span class="sub">${overdueRows.length} items</span></div><div class="card-body card-body--flush">
          ${overdueRows.length ? html`<table class="table table--compact"><thead><tr><th>Employee</th><th>Policy</th><th>Stage</th></tr></thead><tbody>
            ${overdueRows.slice(0, 9).map((a) => html`<tr><td>${S().empName(a.employeeId)}<div class="cell-sub">${S().teamName(S().emp(a.employeeId).deptId)}</div></td><td>${a.policyId}<div class="cell-sub">due ${fmtDate(a.due)}</div></td><td>${S().escStage(a) ? html`<span class="badge badge--overdue badge--plain">${S().escStage(a)}</span>` : '—'}</td></tr>`)}
          </tbody></table>${overdueRows.length > 9 ? html`<div class="card-body small muted">+ ${overdueRows.length - 9} more in the CSV export${S().can('manage') ? html` or <a href="#/notifications">escalation queue</a>` : ''}.</div>` : ''}` : html`<div class="card-body">${WA.emptyState('Nothing overdue', '', 'check-circle')}</div>`}
        </div></section>
      </div>
      <h2 class="section-title section-title--sm">Campaign summary</h2>
      <div class="table-wrap"><table class="table table--compact"><thead><tr><th>Campaign</th><th>Status</th><th class="num">Assigned</th><th class="num">Completed</th><th class="num">Pending</th><th class="num">Overdue</th><th class="num">Exempted</th><th>Completion</th></tr></thead><tbody>
        ${camps.map((c, i) => html`<tr><td>${S().can('manage') ? html`<a href="#/campaigns/${c.id}">${c.name}</a>` : c.name}<div class="cell-sub">${c.id}</div></td><td>${WA.badge(c.status)}</td><td class="num">${campSum[i].total}</td><td class="num">${campSum[i].ack}</td><td class="num">${campSum[i].pending}</td><td class="num">${campSum[i].overdue}</td><td class="num">${campSum[i].exempt}</td><td>${WA.meter(campSum[i].rate)}</td></tr>`)}
      </tbody></table></div>`;
  }
  const refreshReport = () => { WA.destroyCharts(); WA.setHTML(WA.$('#report-body'), reportBody()); WA.mountCharts(); };
  WA.handle('change', 'rp-filter', (el) => { rp[el.name] = el.value; refreshReport(); });
  WA.handle('input', 'rp-q', WA.debounce((el) => { rp.q = el.value; refreshReport(); }, 250));
  WA.handle('click', 'rp-reset', () => { Object.assign(rp, { from: '', to: '', campaign: '', dept: '', q: '' }); WA.app.navigate('#/reports', true); });
  WA.handle('click', 'rp-export', () => {
    const list = reportData();
    WA.download(`attestation_report_${S().today()}.csv`, assignmentCSV(list));
    WA.toast(`Exported ${list.length.toLocaleString('en-GB')} rows to CSV.`);
  });

  WA.views.reports = {
    title: 'Reports & Dashboard',
    perm: 'reports',
    render(params, query) {
      if (query.campaign) rp.campaign = query.campaign;
      const st = S().state();
      return html`${WA.crumbs([{ label: 'Policy Management' }, { label: 'Reports & Dashboard' }])}
        <div class="page-head"><div><h1 class="page-title">Reports &amp; Dashboard</h1><p class="page-sub">Live completion status from the demo dataset. All figures are fictional and are not Waha Capital metrics.</p></div>
          <div class="btn-group"><button class="btn btn-secondary" type="button" data-action="rp-export">${icon('download', 16)} Export CSV</button>${S().can('audit') ? html`<a class="btn btn-secondary" href="#/audit">${icon('shield', 16)} Evidence packs</a>` : ''}</div></div>
        ${S().persona().key === 'auditor' ? WA.alertBox('info', 'lock', 'Read-only view', ' Auditors can filter and export but cannot change records or trigger workflow actions.') : ''}
        <div class="toolbar" role="search" aria-label="Report filters">
          <div class="field"><label for="rp-from">Assigned from</label><input id="rp-from" class="input" type="date" name="from" value="${rp.from}" data-change="rp-filter"></div>
          <div class="field"><label for="rp-to">Assigned to</label><input id="rp-to" class="input" type="date" name="to" value="${rp.to}" data-change="rp-filter"></div>
          <div class="field"><label for="rp-campaign">Campaign</label><select id="rp-campaign" class="select" name="campaign" data-change="rp-filter"><option value="">All campaigns</option>${st.campaigns.map((c) => html`<option value="${c.id}" ${sel(rp.campaign === c.id)}>${c.name}</option>`)}</select></div>
          <div class="field"><label for="rp-dept">Department</label><select id="rp-dept" class="select" name="dept" data-change="rp-filter"><option value="">All departments</option>${st.departments.map((d) => html`<option value="${d.id}" ${sel(rp.dept === d.id)}>${d.team}</option>`)}</select></div>
          <div class="field field--grow"><label for="rp-q">Search</label><input id="rp-q" class="input" type="search" placeholder="Employee or policy" value="${rp.q}" data-input="rp-q"></div>
          <button class="btn btn-ghost" type="button" data-action="rp-reset">Reset</button>
        </div>
        <div id="report-body">${reportBody()}</div>`;
    },
  };

  /* =====================================================================
     Audit evidence (read-only)
     ===================================================================== */
  const au = { q: '', policy: '', campaign: '', status: '', outcome: '', page: 1 };
  function auditData() {
    const q = au.q.toLowerCase();
    return S().state().assignments.filter((a) => {
      if (au.policy && a.policyId !== au.policy) return false;
      if (au.campaign && a.campaignId !== au.campaign) return false;
      if (au.status && S().statusOf(a) !== au.status) return false;
      if (au.outcome && (a.outcome || '') !== au.outcome) return false;
      if (q) {
        const e = S().emp(a.employeeId);
        if (!`${a.id} ${e.id} ${e.name} ${a.receipt || ''} ${a.policyId}`.toLowerCase().includes(q)) return false;
      }
      return true;
    }).sort((a, b) => ((b.ackAt || b.closedAt || b.assigned) > (a.ackAt || a.closedAt || a.assigned) ? 1 : -1));
  }
  function auditTable() {
    const list = auditData();
    const pg = WA.paginate(list, au.page, 15);
    if (!list.length) return WA.emptyState('No records match', 'Adjust the search or filters.', 'search');
    return html`<div class="table-wrap"><table class="table table--compact"><caption class="sr-only">Attestation records</caption>
      <thead><tr><th>Record ID</th><th>Employee ID</th><th>Employee</th><th>Policy ID</th><th>Version</th><th>Campaign ID</th><th>Status</th><th>Timestamp</th><th>Receipt</th><th>Outcome</th><th>Exception reason</th><th class="actions"></th></tr></thead>
      <tbody>${pg.items.map((a) => html`<tr>
        <td class="mono">${a.id}</td><td class="mono">${a.employeeId}</td><td class="nowrap">${S().empName(a.employeeId)}</td><td class="mono">${a.policyId}</td><td>${a.version}</td><td class="mono nowrap">${a.campaignId}</td>
        <td>${WA.badge(S().statusOf(a))}</td><td class="nowrap small">${a.ackAt ? fmtDateTime(a.ackAt) : a.closedAt ? fmtDateTime(a.closedAt) : '—'}</td>
        <td class="mono small">${a.receipt || '—'}</td><td class="small">${a.outcome || '—'}</td><td class="small" style="max-width:220px">${a.reason || '—'}</td>
        <td class="actions"><button class="btn btn-ghost btn-sm" type="button" data-action="au-view" data-id="${a.id}">${icon('eye', 15)} View</button></td></tr>`)}
      </tbody></table></div>${WA.pager(pg, 'au-page')}`;
  }
  const refreshAudit = () => { WA.setHTML(WA.$('#audit-table'), auditTable()); const c = WA.$('#audit-count'); if (c) c.textContent = auditData().length.toLocaleString('en-GB'); };
  WA.handle('input', 'au-q', WA.debounce((el) => { au.q = el.value; au.page = 1; refreshAudit(); }, 160));
  WA.handle('change', 'au-filter', (el) => { au[el.name] = el.value; au.page = 1; refreshAudit(); });
  WA.handle('click', 'au-page', (el) => { au.page = Number(el.dataset.page); refreshAudit(); });
  WA.handle('click', 'au-export', () => {
    const list = auditData();
    WA.download(`audit_evidence_${S().today()}.csv`, assignmentCSV(list));
    S().logEvent('audit.export', `Evidence exported to CSV (${list.length} records)`, {});
    S().persist();
    WA.toast(`Exported ${list.length.toLocaleString('en-GB')} records to CSV.`);
  });
  WA.handle('click', 'au-print', () => {
    const list = auditData();
    const f = [au.policy && `Policy ${au.policy}`, au.campaign && `Campaign ${au.campaign}`, au.status && `Status ${au.status}`, au.outcome && `Outcome ${au.outcome}`, au.q && `Search "${au.q}"`].filter(Boolean);
    S().logEvent('audit.print', `Evidence report printed (${list.length} records)`, {});
    S().persist();
    WA.printHTML(evidenceReport('Policy attestation evidence report', list, [`Filters: ${f.length ? f.join(' · ') : 'none'}`]), 'Evidence report');
  });
  WA.handle('click', 'au-view', (el) => {
    const a = S().asg(el.dataset.id);
    const p = S().pol(a.policyId);
    const v = p.versions.find((x) => x.version === a.version) || {};
    const e = S().emp(a.employeeId);
    const lockedAt = a.ackAt || a.closedAt;
    WA.openOverlay({
      title: `Attestation record ${a.id}`, drawer: true, size: 'wide',
      body: html`<div class="retention"><span class="ri">${icon('lock', 18)}</span><div><b>${lockedAt ? 'Record locked' : 'Open record — not yet locked'} ${WA.simBadge('Purview simulated')}</b><span>${lockedAt ? `Retention label "Policy Attestation Record" applied ${fmtDate(lockedAt)} · retain ${S().settings().retentionYears} years · expires ${fmtDate(WA.addDays(WA.isoDate(lockedAt), 365 * S().settings().retentionYears))} · disposition review` : 'The label is applied when the item is acknowledged or an outcome is recorded.'}</span></div></div>
        <dl class="kv" style="margin-top:16px">
          <dt>Attestation record ID</dt><dd class="mono">${a.id}</dd>
          <dt>Employee</dt><dd>${e.name} (${e.id}) · ${S().teamName(e.deptId)}${e.status !== 'Active' ? ` · ${e.status}` : ''}</dd>
          <dt>Policy</dt><dd>${p.id} — ${p.title}</dd>
          <dt>Policy version</dt><dd>${a.version}</dd>
          <dt>Fingerprint</dt><dd class="mono">${v.hash || '—'} <span class="muted">(simulated SHA-256)</span></dd>
          <dt>Campaign</dt><dd>${a.campaignId} — ${(S().camp(a.campaignId) || {}).name || ''}</dd>
          <dt>Status</dt><dd>${WA.badge(S().statusOf(a))}</dd>
          <dt>Assigned / due</dt><dd>${fmtDate(a.assigned)} / ${fmtDate(a.due)}</dd>
          <dt>Opened</dt><dd>${a.openedAt ? fmtDateTime(a.openedAt) : '—'}</dd>
          <dt>Acknowledged</dt><dd>${a.ackAt ? fmtDateTime(a.ackAt) : '—'}</dd>
          <dt>Receipt reference</dt><dd class="mono">${a.receipt || '—'}</dd>
          <dt>Initials / channel</dt><dd>${a.initials || '—'} / ${a.channel || '—'}</dd>
          <dt>Recorded outcome</dt><dd>${a.outcome || '—'}</dd>
          <dt>Exception reason</dt><dd>${a.reason || '—'}</dd>
        </dl>
        ${a.receipt ? html`<div class="btn-group" style="margin-top:14px"><a class="btn btn-secondary btn-sm" href="#/receipt/${a.receipt}">${icon('file-check', 15)} View receipt</a><button class="btn btn-secondary btn-sm" type="button" data-action="print-receipt" data-ref="${a.receipt}">${icon('printer', 15)} Print receipt</button></div>` : ''}
        <h3 style="font-size:15px;margin:22px 0 10px">Event log</h3>
        <ul class="timeline">${S().timeline(a).filter((t) => !t.future).map((t) => html`<li><span class="tl-dot ${t.tone}">${icon(t.kind === 'ack' ? 'check' : 'history', 12)}</span><div class="tl-title">${t.title} ${t.simulated ? WA.simBadge() : ''}</div><div class="tl-meta">${/T/.test(t.ts) ? fmtDateTime(t.ts) : fmtDate(t.ts)}${t.meta ? ' · ' + t.meta : ''}</div></li>`)}</ul>
        <div class="alert alert--info" style="margin-top:12px">${icon('lock', 18)}<div>Read-only evidence. No edit or delete actions are available from this view.</div></div>`,
    });
  });

  WA.views.audit = {
    title: 'Audit Evidence',
    perm: 'audit',
    render() {
      const st = S().state();
      const all = st.assignments;
      const locked = all.filter((a) => !S().isOpen(a)).length;
      const outcomes = WA.uniq(all.map((a) => a.outcome).filter(Boolean)).sort();
      return html`${WA.crumbs([{ label: 'Oversight' }, { label: 'Audit Evidence' }])}
        <div class="page-head"><div><h1 class="page-title">Audit Evidence</h1><p class="page-sub">Read-only access to every attestation record: who acknowledged which policy version, when, how, and every exception with its reason.</p></div>
          <div class="btn-group"><button class="btn btn-secondary" type="button" data-action="au-export">${icon('download', 16)} Export CSV</button><button class="btn btn-primary" type="button" data-action="au-print">${icon('printer', 16)} Print evidence report</button></div></div>
        ${WA.alertBox('warn', 'alert', 'Simulated record locking', ' This standalone demo stores records in browser LocalStorage, which is not immutable. Append-only logging, tamper resistance and Microsoft Purview retention are simulated here and must be implemented and validated in the actual Microsoft 365 environment.')}
        <div class="grid grid-3" style="margin-bottom:16px">
          <div class="retention"><span class="ri">${icon('archive', 18)}</span><div><b>Retention label: Policy Attestation Record</b><span>Retain ${S().settings().retentionYears} years after acknowledgement, then disposition review (simulated)</span></div></div>
          <div class="retention"><span class="ri">${icon('lock', 18)}</span><div><b>${locked.toLocaleString('en-GB')} records locked</b><span>${(all.length - locked).toLocaleString('en-GB')} open records lock on completion or outcome</span></div></div>
          <div class="retention"><span class="ri">${icon('shield', 18)}</span><div><b>Append-only log (simulated)</b><span>${st.events.length.toLocaleString('en-GB')} events · employees can add but never edit or delete</span></div></div>
        </div>
        <div class="toolbar" role="search" aria-label="Evidence filters">
          <div class="field field--grow"><label for="au-q">Search</label><input id="au-q" class="input" type="search" placeholder="Record ID, employee name or ID, receipt" value="${au.q}" data-input="au-q"></div>
          <div class="field"><label for="au-policy">Policy</label><select id="au-policy" class="select" name="policy" data-change="au-filter"><option value="">All policies</option>${WA.uniq(all.map((a) => a.policyId)).sort().map((id) => html`<option value="${id}" ${sel(au.policy === id)}>${id} ${S().pol(id).title}</option>`)}</select></div>
          <div class="field"><label for="au-campaign">Campaign</label><select id="au-campaign" class="select" name="campaign" data-change="au-filter"><option value="">All campaigns</option>${st.campaigns.map((c) => html`<option value="${c.id}" ${sel(au.campaign === c.id)}>${c.id} ${c.name}</option>`)}</select></div>
          <div class="field"><label for="au-status">Status</label><select id="au-status" class="select" name="status" data-change="au-filter"><option value="">All</option>${['Acknowledged', 'Pending', 'In Progress', 'Overdue', 'Exempted', 'Non-compliant', 'Withdrawn'].map((s) => html`<option ${sel(au.status === s)}>${s}</option>`)}</select></div>
          <div class="field"><label for="au-outcome">Outcome</label><select id="au-outcome" class="select" name="outcome" data-change="au-filter"><option value="">All</option>${outcomes.map((s) => html`<option ${sel(au.outcome === s)}>${s}</option>`)}</select></div>
        </div>
        <p class="small muted" style="margin:-4px 0 10px"><b id="audit-count">${auditData().length.toLocaleString('en-GB')}</b> matching records</p>
        <div id="audit-table">${auditTable()}</div>`;
    },
  };

  /* =====================================================================
     Line manager dashboard
     ===================================================================== */
  const tm = { member: '', policy: '' };
  WA.handle('change', 'tm-filter', (el) => { tm[el.name] = el.value; WA.app.refresh(); });
  WA.handle('click', 'tm-nudge', (el) => {
    const a = S().asg(el.dataset.id);
    S().notify(a.employeeId, 'reminder', 'Teams', `Your manager asked you to complete ${S().pol(a.policyId).title}`, 'Nudge from your line manager (simulated Teams message).', `#/read/${a.id}`);
    S().logEvent('assignment.reminder', `Line manager nudge sent to ${S().empName(a.employeeId)} (simulated Teams)`, { assignmentId: a.id, employeeId: a.employeeId, policyId: a.policyId, campaignId: a.campaignId }, { simulated: true });
    S().persist();
    WA.toast(`Nudge sent to ${S().empName(a.employeeId)} (simulated).`);
  });

  WA.views.team = {
    title: 'My Team',
    perm: 'team',
    render() {
      const u = S().user();
      const team = S().directReports(u.id);
      const ids = new Set(team.map((e) => e.id));
      const all = S().state().assignments.filter((a) => ids.has(a.employeeId) && a.status !== 'Withdrawn');
      const list = all.filter((a) => (!tm.member || a.employeeId === tm.member) && (!tm.policy || a.policyId === tm.policy));
      const sum = S().summarize(list);
      const upcoming = list.filter((a) => S().isOpen(a) && S().statusOf(a) !== 'Overdue' && S().daysToDue(a) <= 7).sort((a, b) => (a.due < b.due ? -1 : 1));
      const overdue = list.filter((a) => S().statusOf(a) === 'Overdue').sort((a, b) => S().escStage(b) - S().escStage(a));
      const escHistory = [];
      list.forEach((a) => S().timeline(a).forEach((t) => { if (!t.future && t.kind === 'escalation') escHistory.push({ a, t }); }));
      escHistory.sort((x, y) => (x.t.ts < y.t.ts ? 1 : -1));
      const members = team.filter((e) => !tm.member || e.id === tm.member);
      return html`${WA.crumbs([{ label: 'Oversight' }, { label: 'My Team' }])}
        <div class="page-head"><div><h1 class="page-title">My team’s attestation status</h1><p class="page-sub">${u.name} · ${u.title} · ${team.length} direct reports from Entra ID manager data (simulated). Read-only, apart from simulated nudges.</p></div></div>
        <div class="toolbar">
          <div class="field"><label for="tm-member">Team member</label><select id="tm-member" class="select" name="member" data-change="tm-filter"><option value="">All team members</option>${team.map((e) => html`<option value="${e.id}" ${sel(tm.member === e.id)}>${e.name}</option>`)}</select></div>
          <div class="field"><label for="tm-policy">Policy</label><select id="tm-policy" class="select" name="policy" data-change="tm-filter"><option value="">All policies</option>${WA.uniq(all.map((a) => a.policyId)).sort().map((id) => html`<option value="${id}" ${sel(tm.policy === id)}>${id} ${S().pol(id).title}</option>`)}</select></div>
        </div>
        <div class="kpis">
          ${WA.kpi({ label: 'Team members', value: members.length, iconName: 'users' })}
          ${WA.kpi({ label: 'Assigned policies', value: sum.total, iconName: 'clipboard-check' })}
          ${WA.kpi({ label: 'Completion rate', value: WA.fmtPct(sum.rate), iconName: 'percent', bar: sum.rate })}
          ${WA.kpi({ label: 'Overdue', value: sum.overdue, iconName: 'alert', tone: sum.overdue ? 'bad' : '' })}
          ${WA.kpi({ label: 'Due in 7 days', value: upcoming.length, iconName: 'calendar', tone: 'warn' })}
        </div>
        <div class="table-wrap"><table class="table"><caption class="sr-only">Completion by team member</caption><thead><tr><th>Team member</th><th class="num">Assigned</th><th class="num">Completed</th><th class="num">Pending</th><th class="num">Overdue</th><th>Completion</th></tr></thead><tbody>
          ${members.map((e) => { const s = S().summarize(list.filter((a) => a.employeeId === e.id)); return html`<tr><td><div class="row" style="gap:10px">${WA.avatar(e.name, 'sm')}<div><b>${e.name}</b><div class="cell-sub">${e.id} · ${e.title}</div></div></div></td><td class="num">${s.total}</td><td class="num">${s.ack}</td><td class="num">${s.pending}</td><td class="num">${s.overdue ? html`<b style="color:var(--error)">${s.overdue}</b>` : 0}</td><td>${WA.meter(s.rate)}</td></tr>`; })}
        </tbody></table></div>
        <div class="grid grid-3" style="margin-top:16px">
          <section class="card"><div class="card-head"><h3>${icon('alert', 16)} Overdue acknowledgements</h3><span class="sub">${overdue.length}</span></div><div class="card-body">
            ${overdue.length ? overdue.slice(0, 10).map((a) => html`<div class="news-item"><b>${S().empName(a.employeeId)} — ${S().pol(a.policyId).title}</b><span>Due ${fmtDate(a.due)} · ${S().escStage(a) ? `escalation stage ${S().escStage(a)}` : 'overdue'}</span>
              <div style="margin-top:6px"><button class="btn btn-secondary btn-sm" type="button" data-action="tm-nudge" data-id="${a.id}">${icon('message', 14)} Nudge</button> <button class="btn btn-ghost btn-sm" type="button" data-action="open-assignment" data-id="${a.id}">Details</button></div></div>`) : html`<p class="muted small" style="margin:0">Nothing overdue in your team.</p>`}
          </div></section>
          <section class="card"><div class="card-head"><h3>${icon('calendar', 16)} Upcoming deadlines</h3><span class="sub">next 7 days</span></div><div class="card-body">
            ${upcoming.length ? upcoming.slice(0, 10).map((a) => html`<div class="news-item"><b>${S().empName(a.employeeId)}</b><span>${a.policyId} ${S().pol(a.policyId).title} · due ${fmtDate(a.due)} (${WA.relDays(S().daysToDue(a))})</span></div>`) : html`<p class="muted small" style="margin:0">No deadlines in the next 7 days.</p>`}
          </div></section>
          <section class="card"><div class="card-head"><h3>${icon('arrow-up', 16)} Escalation history</h3></div><div class="card-body">
            ${escHistory.length ? html`<ul class="timeline">${escHistory.slice(0, 10).map(({ a, t }) => html`<li><span class="tl-dot bad">${icon('arrow-up', 12)}</span><div class="tl-title">${S().empName(a.employeeId)} · ${a.policyId}</div><div class="tl-meta">${t.title} · ${fmtDate(t.ts)} ${t.simulated ? '(simulated)' : ''}</div></li>`)}</ul>` : html`<p class="muted small" style="margin:0">No escalations for your team.</p>`}
          </div></section>
        </div>`;
    },
  };
})();
