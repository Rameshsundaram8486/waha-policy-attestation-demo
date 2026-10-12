/* Intranet + Policy & Procedure library views (recreating the existing SPFx portal screens). */
(function () {
  'use strict';
  const WA = window.WA;
  const { html, raw, icon, fmtDate } = WA;
  const S = () => WA.svc;

  /* ---------- shared view helpers ---------- */
  const BIZ = [
    { name: 'Waha Capital', slug: 'waha-capital', abbr: 'WC', blurb: 'Group-wide governance, conduct and corporate policies (fictional).' },
    { name: 'Waha Investments', slug: 'waha-investments', abbr: 'WI', blurb: 'Asset management departments and operating procedures (fictional).' },
    { name: 'Private Investments', slug: 'private-investments', abbr: 'PI', blurb: 'Private investments policies and procedures (fictional).' },
  ];
  const bizBySlug = (slug) => BIZ.find((b) => b.slug === slug);
  const bizByName = (name) => BIZ.find((b) => b.name === name);
  const MONTH2 = (d) => d.slice(5, 7) + d.slice(0, 4);
  function fileName(p) {
    const b = bizByName(p.businesses.includes('Waha Investments') ? 'Waha Investments' : p.businesses[0]);
    return `${p.id}_${b ? b.abbr : 'WC'} ${p.title}_${MONTH2(p.uploaded)}.pdf`;
  }
  /** Policies visible in the library for the current persona (drafts only for policy owners). */
  function libraryPolicies() {
    const manage = S().can('manage');
    return S().state().policies.filter((p) => manage || (p.status !== 'Draft' && p.versions.length));
  }
  function myOpenAssignment(pid) {
    const u = S().user();
    return S().asgFor(u.id).filter((a) => a.policyId === pid && S().isOpen(a)).sort((a, b) => (a.due < b.due ? -1 : 1))[0];
  }
  function myLatestAck(pid) {
    const u = S().user();
    return S().asgFor(u.id).filter((a) => a.policyId === pid && a.status === 'Acknowledged').sort((a, b) => (a.ackAt < b.ackAt ? 1 : -1))[0];
  }
  function statusBadge(a) { return WA.badge(S().statusOf(a)); }

  function libraryTable(list, opts) {
    const o = opts || {};
    const rows = list.length
      ? list.map((p) => html`<tr>
          <td><a class="doc-link" href="#/policy/${p.id}">${icon('pdf', 18)}<span>${fileName(p)}</span></a></td>
          <td>${WA.pills(p.businesses)}</td>
          <td>${WA.pills([S().deptName(p.deptId)])}</td>
          <td class="nowrap-lg">${S().empName(p.ownerId)}</td>
          <td>${p.approver}</td>
          <td class="nowrap">${fmtDate(p.created, 'long')}</td>
          <td class="nowrap">${fmtDate(p.uploaded, 'long')}</td>
          <td>${p.version}${p.draft ? html` <span class="badge badge--draft badge--plain">draft v${p.draft.version}</span>` : ''}</td>
          <td class="nowrap">${p.effective ? fmtDate(p.effective, 'long') : '—'}</td>
          <td class="nowrap">${fmtDate(p.review, 'long')}</td>
          <td>${p.attestation ? html`<span class="badge badge--teal">Required</span>` : html`<span class="badge badge--neutral">Not required</span>`}</td>
          ${o.showStatus ? html`<td>${WA.badge(p.status)}</td>` : ''}
        </tr>`)
      : html`<tr>${Array.from({ length: o.showStatus ? 12 : 11 }, () => html`<td>-</td>`)}</tr>`;
    return html`<div class="table-wrap table-wrap--lib"><table class="table table--lib">
        <caption class="sr-only">${o.caption || 'Policy documents'}</caption>
        <thead><tr>
          <th scope="col"><span class="th-icon">${icon('file', 18)} Name</span></th><th scope="col">Business</th><th scope="col">Department</th>
          <th scope="col">Document Owner</th><th scope="col">Approver</th><th scope="col">Creation Date</th><th scope="col">Upload Date</th>
          <th scope="col">Version</th><th scope="col">Effective Date</th><th scope="col">Review Date</th><th scope="col">Attestation</th>${o.showStatus ? html`<th scope="col">Status</th>` : ''}
        </tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function recentSearches() {
    const list = S().state().session.recentSearches || [];
    return html`<h2 class="section-title">Recently Searched Text</h2>
      <div class="recent-search">${list.length ? list.map((q) => html`<button type="button" data-action="recent-search" data-q="${q}">${icon('search', 13)} ${q}</button>`) : html`<span class="muted small">No recent searches yet.</span>`}</div>`;
  }
  function addRecentSearch(q) {
    q = String(q || '').trim();
    if (!q) return;
    const s = S().state().session;
    s.recentSearches = [q, ...(s.recentSearches || []).filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 6);
    S().persist();
  }
  function addRecentViewed(pid) {
    const s = S().state().session;
    s.recentViewed = [pid, ...(s.recentViewed || []).filter((x) => x !== pid)].slice(0, 4);
    S().persist();
  }
  WA.handle('click', 'recent-search', (el) => WA.app.navigate(`#/policies?q=${encodeURIComponent(el.dataset.q)}`));

  WA.vh = { BIZ, bizBySlug, bizByName, fileName, libraryPolicies, myOpenAssignment, myLatestAck, statusBadge, libraryTable, addRecentSearch, addRecentViewed };

  /* =====================================================================
     Waha Intranet home
     ===================================================================== */
  WA.views.home = {
    title: 'Waha Intranet',
    render() {
      const u = S().user();
      const p = S().persona();
      const mine = S().can('attest') ? S().asgFor(u.id) : [];
      const sum = S().summarize(mine);
      const overdue = mine.filter((a) => S().statusOf(a) === 'Overdue');
      const hour = new Date().getHours();
      const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
      return html`
        ${WA.crumbs([{ label: 'Waha Intranet' }])}
        ${overdue.length ? html`<div class="overdue-banner" role="alert">${icon('alert', 22)}<div><strong>You have ${WA.plural(overdue.length, 'overdue policy acknowledgement')}.</strong><div class="small">Please read and acknowledge as soon as possible — your line manager has been notified (simulated escalation).</div></div><a class="btn btn-danger-solid btn-sm" href="#/attestation?tab=overdue">Review now</a></div>` : ''}
        <div class="home-hero" style="margin-top:14px">
          <div><h1>${greet}, ${u.name.split(' ')[0]}</h1><p>${u.title} · ${S().teamName(u.deptId)} · viewing as <strong>${p.label}</strong> persona</p></div>
          <button class="btn btn-secondary" type="button" data-action="open-guide">${icon('book', 18)} Start guided demo</button>
        </div>
        <div class="grid grid-main" style="margin-top:22px">
          <div class="stack">
            <section class="card"><div class="card-head"><h3>Quick links</h3></div><div class="card-body"><div class="quick-links">
              <a class="quick-link" href="#/policies"><span class="ql-ico">${icon('building', 20)}</span>Policy &amp; Procedure</a>
              ${S().can('attest') ? html`<a class="quick-link" href="#/attestation"><span class="ql-ico">${icon('clipboard-check', 20)}</span>Attestation Centre</a>` : ''}
              ${S().can('manage') ? html`<a class="quick-link" href="#/console"><span class="ql-ico">${icon('sliders', 20)}</span>Policy Owner Console</a><a class="quick-link" href="#/campaigns/new"><span class="ql-ico">${icon('megaphone', 20)}</span>New campaign</a>` : ''}
              ${S().can('reports') ? html`<a class="quick-link" href="#/reports"><span class="ql-ico">${icon('chart', 20)}</span>Reports &amp; Dashboard</a>` : ''}
              ${S().can('team') ? html`<a class="quick-link" href="#/team"><span class="ql-ico">${icon('users', 20)}</span>My Team</a>` : ''}
              ${S().can('audit') ? html`<a class="quick-link" href="#/audit"><span class="ql-ico">${icon('shield', 20)}</span>Audit Evidence</a>` : ''}
              <a class="quick-link" href="#/business"><span class="ql-ico">${icon('network', 20)}</span>Business</a>
            </div></div></section>
            <section class="card"><div class="card-head"><h3>Intranet news</h3><span class="sub">Fictional placeholder content</span></div><div class="card-body">
              <div class="news-item"><b>Annual Policy Attestation 2026 is open</b><span>Policy owners · 21 Sep 2026 — complete your acknowledgements in the Attestation Centre.</span></div>
              <div class="news-item"><b>Information Security Policy v4.0 published</b><span>Group IT · 28 Sep 2026 — a major version that requires re-attestation.</span></div>
              <div class="news-item"><b>Office closure for public holiday</b><span>Facilities · placeholder announcement for the demo.</span></div>
            </div></section>
          </div>
          <div class="stack">
            ${S().can('attest') ? html`<section class="card"><div class="card-head"><h3>My attestations</h3><a class="small" href="#/attestation">Open centre</a></div><div class="card-body">
              <div class="row row--between"><span>Completed</span><b>${sum.ack} of ${sum.applicable}</b></div>
              <div style="margin:8px 0 14px">${WA.progress(sum.rate)}</div>
              <div class="row" style="gap:8px">${WA.badge('Pending')} <b>${sum.pending}</b> ${WA.badge('Overdue')} <b>${sum.overdue}</b></div>
            </div></section>` : html`<section class="card"><div class="card-head"><h3>Your access</h3></div><div class="card-body small">${p.blurb}</div></section>`}
            <section class="card"><div class="card-head"><h3>About this demo</h3></div><div class="card-body small">
              <p style="margin-top:0">This standalone prototype shows how policy attestation extends the existing intranet. Switch persona in the header to see each role.</p>
              <a href="#/about">What is simulated →</a></div></section>
          </div>
        </div>`;
    },
  };

  /* =====================================================================
     Business
     ===================================================================== */
  WA.views.business = {
    title: 'Business',
    render() {
      const all = libraryPolicies();
      return html`${WA.crumbs([{ label: 'Business' }])}
        <div class="page-head"><div><h1 class="page-title">Business</h1><p class="page-sub">Businesses in the Group and their policy libraries. Descriptions are placeholders.</p></div></div>
        <div class="folder-grid doc-grid">${BIZ.map((b) => html`<a class="folder-card" href="#/policies/${b.slug}">${WA.folderArt()}<span>${b.name}</span><span class="folder-meta">${WA.plural(all.filter((p) => p.businesses.includes(b.name)).length, 'document')}</span></a>`)}</div>
        <h2 class="section-title section-title--sm">Departments</h2>
        <div class="table-wrap"><table class="table"><thead><tr><th>Department</th><th>Head (fictional)</th><th class="num">Employees</th><th class="num">Policies owned</th></tr></thead><tbody>
          ${S().state().departments.map((d) => html`<tr><td><a href="#/policies/waha-investments/${d.id}">${d.team !== d.name ? `${d.team} (${d.name})` : d.name}</a></td><td>${S().empName(d.headId)}</td><td class="num">${S().activeEmployees().filter((e) => e.deptId === d.id).length}</td><td class="num">${all.filter((p) => p.deptId === d.id).length}</td></tr>`)}
        </tbody></table></div>`;
    },
  };

  /* =====================================================================
     Policy & Procedure landing (screenshot 3)
     ===================================================================== */
  const lib = { q: '', biz: '', dept: '', page: 1 };
  function filteredLibrary() {
    const q = lib.q.toLowerCase();
    return libraryPolicies().filter((p) =>
      (!lib.biz || p.businesses.includes(lib.biz)) &&
      (!lib.dept || p.deptId === lib.dept) &&
      (!q || [p.id, p.title, S().deptName(p.deptId), S().empName(p.ownerId), p.approver, p.businesses.join(' ')].join(' ').toLowerCase().includes(q)))
      .sort((a, b) => a.id.localeCompare(b.id));
  }
  function libResults() {
    const list = filteredLibrary();
    const pg = WA.paginate(list, lib.page, 10);
    const active = lib.q || lib.biz || lib.dept;
    return html`<div class="section-row"><h2 class="section-title">${active ? 'Search results' : 'Files'}</h2>
        <span class="repo-link">${list.length} document${list.length === 1 ? '' : 's'}${active ? html` · <button class="link-btn" type="button" data-action="lib-clear">Clear filters</button>` : ''}</span></div>
      ${list.length ? libraryTable(pg.items, { showStatus: S().can('manage') }) : WA.emptyState('No policies match your search', 'Try another keyword, or clear the business and department filters.', 'search')}
      ${WA.pager(pg, 'lib-page')}`;
  }
  const refreshLib = () => WA.setHTML(WA.$('#lib-results'), libResults());
  WA.handle('input', 'lib-q', WA.debounce((el) => { lib.q = el.value; lib.page = 1; refreshLib(); }, 160));
  WA.handle('change', 'lib-biz', (el) => { lib.biz = el.value; lib.page = 1; refreshLib(); });
  WA.handle('change', 'lib-dept', (el) => { lib.dept = el.value; lib.page = 1; refreshLib(); });
  WA.handle('click', 'lib-page', (el) => { lib.page = Number(el.dataset.page); refreshLib(); WA.$('#lib-results').scrollIntoView({ block: 'start', behavior: 'smooth' }); });
  WA.handle('click', 'lib-clear', () => { Object.assign(lib, { q: '', biz: '', dept: '', page: 1 }); WA.app.navigate('#/policies', true); });
  WA.handle('submit', 'lib-search', (form) => { const q = form.querySelector('input').value.trim(); addRecentSearch(q); lib.q = q; lib.page = 1; refreshLib(); });

  WA.views.landing = {
    title: 'Policy & Procedure',
    render(params, query) {
      if (query.q != null) { lib.q = query.q; lib.page = 1; }
      if (query.biz != null) lib.biz = query.biz;
      if (query.dept != null) lib.dept = query.dept;
      const recent = (S().state().session.recentViewed || []).map((id) => S().pol(id)).filter(Boolean);
      const all = libraryPolicies();
      return html`
        <div class="hero">
          <span class="hero-pill">Policy &amp; Procedure</span>
          <h1>Here You Can Find All The Policies, Processes, Procedures And Knowledge Bases Specific To And Used By Waha Capital</h1>
          <form class="search" role="search" data-form="lib-search">
            ${icon('search', 22)}
            <label class="sr-only" for="lib-q">Search policies</label>
            <input id="lib-q" type="search" placeholder="Search..." value="${lib.q}" data-input="lib-q" autocomplete="off">
          </form>
          <div class="hero-filters">
            <label class="sr-only" for="lib-biz">Select Business</label>
            <select id="lib-biz" class="select" data-change="lib-biz">
              <option value="">Select Business</option>
              ${BIZ.map((b) => html`<option value="${b.name}" ${lib.biz === b.name ? raw('selected') : ''}>${b.name}</option>`)}
            </select>
            <label class="sr-only" for="lib-dept">Select Department</label>
            <select id="lib-dept" class="select" data-change="lib-dept">
              <option value="">Select Department</option>
              ${S().state().departments.map((d) => html`<option value="${d.id}" ${lib.dept === d.id ? raw('selected') : ''}>${d.name}</option>`)}
            </select>
          </div>
        </div>
        <h2 class="section-title">Recently Viewed Document</h2>
        ${recent.length ? html`<div class="folder-grid doc-grid">${recent.map((p) => html`<a class="folder-card doc-card" href="#/policy/${p.id}">${WA.pdfArt()}<span>${p.title}</span></a>`)}</div>` : html`<p class="muted">Documents you open will appear here.</p>`}
        <h2 class="section-title">Documents</h2>
        <div class="folder-grid doc-grid">${BIZ.map((b) => html`<a class="folder-card" href="#/policies/${b.slug}">${WA.folderArt()}<span>${b.name}</span><span class="folder-meta">${WA.plural(all.filter((p) => p.businesses.includes(b.name)).length, 'document')}</span></a>`)}</div>
        <div id="lib-results">${libResults()}</div>`;
    },
  };

  /* =====================================================================
     Business folder (screenshot 2) and department folder (screenshot 1)
     ===================================================================== */
  function deptsForBusiness(b) {
    const all = libraryPolicies().filter((p) => p.businesses.includes(b.name));
    const ids = b.slug === 'waha-investments' ? S().state().departments.map((d) => d.id) : WA.uniq(all.map((p) => p.deptId));
    return S().state().departments.filter((d) => ids.includes(d.id));
  }
  WA.views.businessFolder = {
    title: 'Policy & Procedure',
    render(params) {
      const b = bizBySlug(params.biz);
      if (!b) return WA.views.notFound.render();
      this.title = b.name;
      const docs = libraryPolicies().filter((p) => p.businesses.includes(b.name));
      return html`${WA.crumbs([{ label: 'Policy & Procedure', href: '#/policies' }, { label: b.name, folder: true }])}
        ${recentSearches()}
        <h2 class="section-title">Folders</h2>
        <div class="folder-grid">${deptsForBusiness(b).map((d) => {
          const n = docs.filter((p) => p.deptId === d.id).length;
          return html`<a class="folder-card" href="#/policies/${b.slug}/${d.id}">${WA.folderArt()}<span>${d.name}</span><span class="folder-meta">${WA.plural(n, 'file')}</span></a>`;
        })}</div>
        <div class="section-row"><h2 class="section-title">Files</h2><span class="repo-link">Access file document repository <a href="#/policies?biz=${encodeURIComponent(b.name)}">here</a></span></div>
        ${libraryTable([], { caption: `Files directly in ${b.name}` })}`;
    },
  };
  WA.views.deptFolder = {
    title: 'Policy & Procedure',
    render(params, query) {
      const b = bizBySlug(params.biz);
      const d = S().dept(params.dept);
      if (!b || !d) return WA.views.notFound.render();
      this.title = d.name;
      const docs = libraryPolicies().filter((p) => p.businesses.includes(b.name) && p.deptId === d.id).sort((x, y) => x.id.localeCompare(y.id));
      const pg = WA.paginate(docs, Number(query.page) || 1, 10);
      return html`${WA.crumbs([{ label: 'Policy & Procedure', href: '#/policies' }, { label: b.name, href: `#/policies/${b.slug}`, folder: true }, { label: d.name, folder: true }])}
        ${recentSearches()}
        <h2 class="section-title">Folders</h2>
        <div class="empty-folder"><div class="empty-art">${icon('file-signature', 66)}</div>No contents available to show</div>
        <div class="section-row"><h2 class="section-title">Files</h2><span class="repo-link">Access file document repository <a href="#/policies?dept=${d.id}">here</a></span></div>
        ${docs.length ? libraryTable(pg.items, { caption: `Files in ${d.name}`, showStatus: S().can('manage') }) : html`${libraryTable([])}<p class="muted small">No documents for ${d.name} in ${b.name} yet.</p>`}
        ${WA.pager(pg, 'dept-page')}`;
    },
  };
  WA.handle('click', 'dept-page', (el) => WA.app.navigate(location.hash.split('?')[0] + '?page=' + el.dataset.page));

  /* =====================================================================
     Policy document page
     ===================================================================== */
  function documentPaper(p, version) {
    const content = WA.data.policyContent({ ...p, version: version || p.version }, S().deptName(p.deptId), S().empName(p.ownerId));
    return html`<article class="paper" aria-label="${p.title} document">
        <h1>${p.title}</h1>
        <div class="muted small">${p.id} · Version ${version || p.version} · Fictional sample content</div>
        <div class="doc-meta">
          <div><b>Business:</b> ${p.businesses.join(', ')}</div><div><b>Department:</b> ${S().deptName(p.deptId)}</div>
          <div><b>Document owner:</b> ${S().empName(p.ownerId)}</div><div><b>Approver:</b> ${p.approver}</div>
          <div><b>Effective date:</b> ${p.effective ? fmtDate(p.effective, 'long') : 'Not yet effective'}</div><div><b>Next review:</b> ${fmtDate(p.review, 'long')}</div>
        </div>
        ${content.map((s) => html`<h2>${s.h}</h2>${(s.p || []).map((t) => html`<p>${t}</p>`)}${s.list ? html`<ol>${s.list.map((t) => html`<li>${t}</li>`)}</ol>` : ''}`)}
        <div class="end-mark" id="doc-end">— End of document —</div>
      </article>`;
  }
  WA.vh.documentPaper = documentPaper;

  WA.views.policyView = {
    title: 'Policy',
    render(params) {
      const p = S().pol(params.id);
      if (!p || (p.status === 'Draft' && !S().can('manage') && !p.versions.length)) return WA.views.notFound.render();
      this.title = p.title;
      const b = bizByName(p.businesses.includes('Waha Investments') ? 'Waha Investments' : p.businesses[0]);
      const open = S().can('attest') ? myOpenAssignment(p.id) : null;
      const done = S().can('attest') ? myLatestAck(p.id) : null;
      const cur = p.versions[p.versions.length - 1];
      return html`${WA.crumbs([{ label: 'Policy & Procedure', href: '#/policies' }, { label: b.name, href: `#/policies/${b.slug}`, folder: true }, { label: S().deptName(p.deptId), href: `#/policies/${b.slug}/${p.deptId}`, folder: true }, { label: p.title }])}
        <div class="page-head">
          <div><h1 class="page-title">${p.title}</h1>
            <p class="page-sub">${p.id} · v${p.version} · ${S().deptName(p.deptId)} · Owner ${S().empName(p.ownerId)}</p>
            <div class="row" style="margin-top:10px">${WA.badge(p.status)} ${p.attestation ? html`<span class="badge badge--teal">Attestation required</span>` : html`<span class="badge badge--neutral">Read only — no attestation</span>`} ${p.regulatory ? html`<span class="badge badge--progress badge--plain">Regulatory</span>` : ''}</div>
          </div>
          <div class="btn-group">
            ${open ? html`<a class="btn btn-primary btn-lg" href="#/read/${open.id}">${icon('file-check', 18)} Read &amp; Acknowledge</a>` : ''}
            ${!open && done ? html`<a class="btn btn-secondary" href="#/receipt/${done.receipt}">${icon('check-circle', 18)} Acknowledged ${fmtDate(done.ackAt)} — view receipt</a>` : ''}
            ${S().can('manage') ? html`<a class="btn btn-secondary" href="#/console/policy/${p.id}">${icon('sliders', 18)} Manage in console</a>` : ''}
          </div>
        </div>
        ${open ? WA.alertBox(S().statusOf(open) === 'Overdue' ? 'bad' : 'info', 'clipboard-check', `You have an open attestation for v${open.version}`, html` Due ${fmtDate(open.due)} (${WA.relDays(S().daysToDue(open))}). Use <b>Read &amp; Acknowledge</b> to open the attestation reader with the minimum reading time.`) : ''}
        <div class="grid grid-main">
          <div class="reader-doc" style="height:auto;max-height:780px">${documentPaper(p)}</div>
          <div class="stack">
            <section class="card"><div class="card-head"><h3>Document details</h3></div><div class="card-body">
              <dl class="kv">
                <dt>Policy ID</dt><dd>${p.id}</dd>
                <dt>Business</dt><dd>${p.businesses.join(', ')}</dd>
                <dt>Department</dt><dd>${S().deptName(p.deptId)}</dd>
                <dt>Document owner</dt><dd>${S().empName(p.ownerId)}</dd>
                <dt>Approver</dt><dd>${p.approver}</dd>
                <dt>Creation date</dt><dd>${fmtDate(p.created, 'long')}</dd>
                <dt>Upload date</dt><dd>${fmtDate(p.uploaded, 'long')}</dd>
                <dt>Version</dt><dd>${p.version}</dd>
                <dt>Effective date</dt><dd>${p.effective ? fmtDate(p.effective, 'long') : '—'}</dd>
                <dt>Review date</dt><dd>${fmtDate(p.review, 'long')} ${WA.badge(S().reviewInfo(p).state)}</dd>
                <dt>Attestation</dt><dd>${p.attestation ? 'Required' : 'Not required'}</dd>
                <dt>Audience</dt><dd>${S().audienceLabel(p.audience)}</dd>
                <dt>Min. reading time</dt><dd>${p.minRead} min (production setting)</dd>
                ${cur ? html`<dt>Fingerprint</dt><dd><span class="mono">${cur.hash.slice(0, 24)}…</span><div class="cell-sub">SHA-256 of the PDF (simulated)</div></dd>` : ''}
              </dl></div></section>
            <section class="card"><div class="card-head"><h3>Version history</h3></div><div class="card-body card-body--flush">
              <table class="table table--compact"><thead><tr><th>Version</th><th>Published</th><th>Change</th></tr></thead><tbody>
              ${p.versions.slice().reverse().map((v) => html`<tr><td><b>${v.version}</b>${v.major ? html` <span class="tag">major</span>` : ''}</td><td class="nowrap">${fmtDate(v.date)}</td><td class="small">${v.note}</td></tr>`)}
              ${p.draft ? html`<tr><td><b>${p.draft.version}</b> <span class="badge badge--draft badge--plain">draft</span></td><td>—</td><td class="small">${p.draft.note}</td></tr>` : ''}
              </tbody></table></div></section>
          </div>
        </div>`;
    },
    mount(root, params) { if (S().pol(params.id)) addRecentViewed(params.id); },
  };

  /* =====================================================================
     About / not found / access restricted
     ===================================================================== */
  WA.views.about = {
    title: 'About this demo',
    render() {
      const rows = [
        ['Policy register and version control', 'Policy & Procedure library, Policy Owner Console, policy versions with simulated SHA-256 fingerprints'],
        ['Attestation campaigns', 'Campaign Management: five campaign types, five-step wizard, scheduled and rolling campaigns'],
        ['Notifications, reminders and escalation', 'Notifications centre, assignment drawer and "Simulate workflow" controls (days 0, 5, 10, 13, 14, 15, 21, 28, weekly)'],
        ['Employee attestation experience', 'Attestation Centre, policy reader with demo reading timer, scroll check, confirmation, initials and receipt'],
        ['Audit trail and records', 'Audit Evidence: read-only record list, timelines, CSV export, printable evidence report, simulated Purview retention'],
        ['Reporting and dashboards', 'Reports & Dashboard with filters, KPIs, five charts and CSV export'],
        ['Policy review and expiry alerts', 'Review & Expiry: 60/30/7-day alerts, overdue review indicator, review completion'],
        ['Identity and organisation data', 'Personas, managers and departments; simulated Entra ID new-joiner and leaver handling'],
      ];
      return html`${WA.crumbs([{ label: 'About this demo' }])}
        <div class="page-head"><div><h1 class="page-title">About this demo</h1><p class="page-sub">A standalone, browser-only prototype of the Policy Attestation Solution scoped for the Waha Capital intranet.</p></div></div>
        ${WA.alertBox('warn', 'alert', 'Everything here is fictional and simulated.', ' Employee names, IDs, policies, campaigns and metrics are invented. No SharePoint, Power Automate, Entra ID, Outlook, Teams or Microsoft Purview connection exists in this demo.')}
        <div class="grid grid-2">
          <section class="card"><div class="card-head"><h3>What is simulated</h3></div><div class="card-body"><ul class="info-list">
            <li><b>Storage:</b> data lives in this browser’s LocalStorage. It is editable and <b>not immutable</b>; production uses SharePoint lists with item-level permissions and Purview record labels.</li>
            <li><b>Audit locking and retention:</b> shown as indicators only. Tamper resistance must be implemented and validated in Microsoft 365.</li>
            <li><b>Messages:</b> emails and Teams adaptive cards are written to the in-app notification centre; nothing is sent.</li>
            <li><b>Time:</b> the demo date is fixed at ${fmtDate(S().today(), 'long')}. "Simulate workflow" advances a per-item clock instead of waiting real days.</li>
            <li><b>Reading time:</b> a short, clearly labelled timer (default ${S().settings().demoReadSeconds}s) plus a scroll-to-end check. Neither proves that a document was read.</li>
            <li><b>Identity:</b> the persona switcher stands in for Entra ID single sign-on.</li>
          </ul></div></section>
          <section class="card"><div class="card-head"><h3>Personas</h3></div><div class="card-body"><ul class="info-list">
            ${Object.values(WA.data.PERSONAS).map((p) => html`<li><b>${p.label}</b> — ${S().empName(p.userId)}: ${p.blurb}</li>`)}
          </ul><p class="small muted">Use <b>Reset demo data</b> (user menu or Policy Owner Console) to restore the seeded scenario.</p></div></section>
        </div>
        <h2 class="section-title section-title--sm">Scope of work coverage</h2>
        <div class="table-wrap"><table class="table"><thead><tr><th>SOW module</th><th>Where to see it in the demo</th></tr></thead><tbody>
          ${rows.map((r) => html`<tr><td class="cell-title">${r[0]}</td><td>${r[1]}</td></tr>`)}
        </tbody></table></div>`;
    },
  };
  WA.views.notFound = {
    title: 'Not found',
    render() {
      return html`<div class="access-denied"><div class="empty-ico">${icon('search', 28)}</div><h1 class="page-title">Page not found</h1><p class="page-sub" style="margin:8px auto 18px">The item may have been removed, or the link is from a reset demo session.</p><a class="btn btn-primary" href="#/policies">Go to Policy &amp; Procedure</a></div>`;
    },
  };
  WA.views.denied = {
    title: 'Access restricted',
    render(params) {
      const p = S().persona();
      return html`<div class="access-denied"><div class="empty-ico">${icon('lock', 28)}</div><h1 class="page-title">Not available to the ${p.label} persona</h1>
        <p class="page-sub" style="margin:8px auto 18px">${params && params.reason ? params.reason : 'In production this is enforced with SharePoint permissions and Entra ID groups.'} Switch persona in the header to explore this area.</p>
        <a class="btn btn-primary" href="#/home">Back to intranet home</a></div>`;
    },
  };
})();
