/* Application shell: hash router, sidebar, header, persona switching, notifications, demo guide. */
(function () {
  'use strict';
  const WA = window.WA;
  const { html, raw, icon, $ } = WA;
  const S = () => WA.svc;

  /* ---------- routes (hash-based so it works on GitHub Pages subpaths and file://) ---------- */
  const ROUTES = [
    ['/home', 'home'], ['/business', 'business'], ['/about', 'about'],
    ['/policies', 'landing'], ['/policies/:biz', 'businessFolder'], ['/policies/:biz/:dept', 'deptFolder'], ['/policy/:id', 'policyView'],
    ['/attestation', 'attestation'], ['/my-policies', 'myPolicies'], ['/read/:aid', 'reader'], ['/receipt/:ref', 'receipt'],
    ['/console', 'console'], ['/console/policy/:id', 'policyAdmin'], ['/reviews', 'reviews'],
    ['/campaigns', 'campaigns'], ['/campaigns/new', 'campaignWizard'], ['/campaigns/:id', 'campaignDetail'],
    ['/notifications', 'notifications'], ['/reports', 'reports'], ['/audit', 'audit'], ['/team', 'team'],
  ];
  function match(path) {
    const parts = path.split('/').filter(Boolean);
    for (const [pattern, view] of ROUTES) {
      const pp = pattern.split('/').filter(Boolean);
      if (pp.length !== parts.length) continue;
      const params = {};
      let ok = true;
      for (let i = 0; i < pp.length; i++) {
        if (pp[i].startsWith(':')) params[pp[i].slice(1)] = decodeURIComponent(parts[i]);
        else if (pp[i] !== parts[i]) { ok = false; break; }
      }
      if (ok) return { view, params };
    }
    return null;
  }
  function parseHash() {
    const h = location.hash.replace(/^#/, '') || '/policies';
    const [path, qs] = h.split('?');
    const query = {};
    new URLSearchParams(qs || '').forEach((v, k) => { query[k] = v; });
    return { path: path || '/policies', query };
  }

  const app = { state: { view: null, params: {}, query: {}, path: '' }, cleanup: null, treeOpen: true };

  function render(isNavigation) {
    const { path, query } = parseHash();
    const m = match(path);
    if (app.cleanup) { try { app.cleanup(); } catch (e) { /* ignore */ } app.cleanup = null; }
    WA.destroyCharts();
    let viewName = m ? m.view : 'notFound';
    const params = m ? m.params : {};
    const view = WA.views[viewName];
    if (view.perm && !S().can(view.perm)) viewName = 'denied';
    const v = WA.views[viewName];
    Object.assign(app.state, { view: viewName, params, query, path });
    const main = $('#view');
    const scrollY = window.scrollY;
    let out;
    try { out = v.render(params, query); } catch (err) {
      console.error(err);
      out = html`<div class="access-denied"><h1 class="page-title">Something went wrong</h1><p class="page-sub">${err.message}</p><button class="btn btn-primary" type="button" data-action="reset-demo">Reset demo data</button></div>`;
    }
    WA.setHTML(main, out);
    document.title = `${v.title || 'Policy Attestation'} · Waha Capital Intranet (Demo)`;
    if (v.mount) { try { app.cleanup = v.mount(main, params, query) || null; } catch (err) { console.error(err); } }
    WA.mountCharts();
    renderChrome();
    if (isNavigation) {
      window.scrollTo(0, 0);
      main.focus({ preventScroll: true });
      $('#app').classList.remove('nav-open');
      markGuideProgress(path);
    } else {
      window.scrollTo(0, scrollY);
    }
  }

  function navigate(hash) {
    if (location.hash === hash) { closePopover(); WA.closeAllOverlays(); render(true); return; }
    location.hash = hash;
  }

  /* ---------- sidebar ---------- */
  const NAV = [
    { group: null, items: [
      { label: 'Waha Intranet', href: '#/home', icon: 'grid', match: ['home'] },
      { label: 'Business', href: '#/business', icon: 'network', match: ['business'] },
      { label: 'Policy & Procedure', href: '#/policies', icon: 'building', match: ['landing', 'policyView'] },
    ] },
    { group: 'Policy Attestation', items: [
      { label: 'Attestation Centre', href: '#/attestation', icon: 'clipboard-check', perm: 'attest', match: ['attestation', 'reader', 'receipt'], count: true },
      { label: 'My Policies', href: '#/my-policies', icon: 'file-check', perm: 'attest', match: ['myPolicies'] },
      { label: 'Notifications', href: '#/notifications', icon: 'bell', match: ['notifications'] },
    ] },
    { group: 'Policy Management', items: [
      { label: 'Policy Owner Console', href: '#/console', icon: 'sliders', perm: 'manage', match: ['console', 'policyAdmin'] },
      { label: 'Campaign Management', href: '#/campaigns', icon: 'megaphone', perm: 'manage', match: ['campaigns', 'campaignWizard', 'campaignDetail'] },
      { label: 'Review & Expiry', href: '#/reviews', icon: 'calendar', perm: 'manage', match: ['reviews'] },
      { label: 'Reports & Dashboard', href: '#/reports', icon: 'chart', perm: 'reports', match: ['reports'] },
    ] },
    { group: 'Oversight', items: [
      { label: 'My Team', href: '#/team', icon: 'users', perm: 'team', match: ['team'] },
      { label: 'Audit Evidence', href: '#/audit', icon: 'shield', perm: 'audit', match: ['audit'] },
    ] },
  ];
  function renderSidebar() {
    const cur = app.state.view;
    const p = S().persona();
    const u = S().user();
    const openCount = S().can('attest') ? S().asgFor(u.id).filter((a) => S().isOpen(a)).length : 0;
    const inFolder = ['businessFolder', 'deptFolder'].includes(cur);
    const curDept = app.state.params.dept;
    const item = (it) => {
      if (it.perm && !S().can(it.perm)) {
        return html`<li><span class="nav-item disabled" aria-disabled="true" title="Not available to the ${p.label} persona">${icon(it.icon, 22)}<span>${it.label}</span><span class="nav-lock">${icon('lock', 14)}</span></span></li>`;
      }
      const active = it.match.includes(cur);
      return html`<li><a class="nav-item ${active ? 'active' : ''}" href="${it.href}" ${active ? raw('aria-current="page"') : ''}>${icon(it.icon, 22)}<span>${it.label}</span>${it.count && openCount ? html`<span class="nav-count" aria-label="${openCount} open">${openCount}</span>` : ''}</a></li>`;
    };
    const groups = NAV.map((g, gi) => html`
      ${g.group ? html`<li class="nav-group-label" role="presentation">${g.group}</li>` : ''}
      ${g.items.map(item)}
      ${gi === 0 ? html`<li>
          <button class="nav-item ${inFolder ? 'active' : ''}" type="button" data-action="toggle-tree" aria-expanded="${app.treeOpen}" aria-controls="nav-tree">${icon('folder-solid', 24)}<span>Waha Investments</span><span class="chev">${icon('chevron-up', 18)}</span></button>
          <ul class="nav-tree" id="nav-tree" ${app.treeOpen ? '' : raw('hidden')}>
            ${S().state().departments.map((d) => html`<li><a class="tree-item ${curDept === d.id ? 'active' : ''}" href="#/policies/waha-investments/${d.id}">${icon('folder-solid', 20)}<span>${d.name}</span></a></li>`)}
          </ul></li>` : ''}`);
    WA.setHTML($('#sidebar'), html`<a class="brand" href="#/home">WAHA CAPITAL<small>INTRANET · DEMO</small></a>
      <ul class="nav">${groups}</ul>
      <div class="sidebar-note">Viewing as <b>${p.label}</b> — ${u.name}. Items with a lock are not available to this persona.</div>`);
  }

  /* ---------- header ---------- */
  function renderTopbar() {
    const u = S().user();
    const p = S().persona();
    const unread = S().unreadCount(u.id);
    WA.setHTML($('#topbar'), html`
      <button class="icon-btn menu-btn" type="button" data-action="open-sidebar" aria-label="Open navigation">${icon('menu', 20)}</button>
      <form class="search" role="search" data-form="global-search">
        ${icon('search', 20)}
        <label class="sr-only" for="global-q">Search policies</label>
        <input id="global-q" type="search" placeholder="Search..." autocomplete="off">
      </form>
      <div class="topbar-right">
        <span class="chip" title="All dates in the demo are relative to this fixed date">${icon('calendar', 14)} Demo date ${WA.fmtDate(S().today())}</span>
        <button class="icon-btn" type="button" data-action="open-guide" aria-label="Open demo guide" title="Demo guide">${icon('book', 19)}</button>
        <button class="icon-btn" type="button" data-action="toggle-notifs" aria-label="Notifications, ${unread} unread" aria-haspopup="dialog" id="bell-btn">${icon('bell', 19)}${unread ? html`<span class="count">${unread > 99 ? '99+' : unread}</span>` : ''}</button>
        <div class="persona-switch"><label for="persona-select">Viewing as</label>
          <select id="persona-select" data-change="persona">${Object.values(WA.data.PERSONAS).map((x) => html`<option value="${x.key}" ${x.key === p.key ? raw('selected') : ''}>${x.label}</option>`)}</select></div>
        <button class="user-btn" type="button" data-action="toggle-user" aria-haspopup="menu" id="user-btn" aria-label="User menu for ${u.name}">${WA.avatar(u.name)}<span class="user-name small"><b>${u.name}</b></span>${icon('chevron-down', 16)}</button>
      </div>`);
  }
  function renderChrome() { renderSidebar(); renderTopbar(); }

  /* ---------- popovers ---------- */
  let popover = null;
  function closePopover() { if (popover) { popover.el.remove(); const b = popover.button; popover = null; if (b && document.contains(b)) b.setAttribute('aria-expanded', 'false'); } }
  function openPopover(button, content, width) {
    closePopover();
    const el = document.createElement('div');
    el.className = 'popover';
    WA.setHTML(el, content);
    document.body.appendChild(el);
    const r = button.getBoundingClientRect();
    const w = width || el.offsetWidth;
    el.style.top = `${window.scrollY + r.bottom + 8}px`;
    el.style.left = `${Math.max(8, Math.min(window.innerWidth - w - 8, r.right - w))}px`;
    button.setAttribute('aria-expanded', 'true');
    popover = { el, button };
    const first = el.querySelector('button, a, select');
    if (first) first.focus();
  }
  function notifPopover(button) {
    const u = S().user();
    const list = S().notificationsFor(u.id).slice(0, 8);
    openPopover(button, html`<div class="notif-panel" role="dialog" aria-label="Notifications">
      <header><b>Notifications</b><span class="row" style="gap:6px">${WA.simBadge('Simulated email & Teams')}<button class="link-btn small" type="button" data-action="notif-read-all">Mark all read</button></span></header>
      ${list.length ? html`<ul class="notif-list">${list.map((n) => WA.notificationItem(n, true))}</ul>` : html`<div style="padding:16px">${WA.emptyState('No notifications', '', 'bell')}</div>`}
      <footer><a href="#/notifications" class="small">Open notification centre</a><span class="small muted">${S().unreadCount(u.id)} unread</span></footer></div>`, Math.min(420, window.innerWidth - 24));
  }
  function userPopover(button) {
    const u = S().user();
    const p = S().persona();
    openPopover(button, html`<div role="menu" aria-label="User menu">
      <div class="popover-head">${WA.avatar(u.name, 'lg')}<div><strong>${u.name}</strong><span>${u.title}<br>${u.id} · ${u.email}</span></div></div>
      <ul class="menu-list">
        <li class="small muted" style="padding:6px 10px">Switch demo persona</li>
        ${Object.values(WA.data.PERSONAS).map((x) => html`<li><button type="button" role="menuitem" class="${x.key === p.key ? 'is-current' : ''}" data-action="set-persona" data-persona="${x.key}">${icon(x.key === 'employee' ? 'user' : x.key === 'owner' ? 'sliders' : x.key === 'manager' ? 'users' : 'shield', 16)} ${x.label} <span class="muted small">— ${S().empName(x.userId)}</span></button></li>`)}
        <li class="menu-sep" role="separator"></li>
        <li><button type="button" role="menuitem" data-action="open-guide">${icon('book', 16)} Demo guide</button></li>
        <li><a role="menuitem" href="#/about">${icon('info', 16)} About this demo</a></li>
        <li><button type="button" role="menuitem" data-action="reset-demo">${icon('reset', 16)} Reset demo data</button></li>
      </ul></div>`, 320);
  }

  /* ---------- persona ---------- */
  function setPersona(key) {
    if (key === S().persona().key) return;
    S().setPersona(key);
    closePopover();
    WA.closeAllOverlays();
    const p = S().persona();
    WA.toast(`Now viewing as ${p.label} — ${S().empName(p.userId)}.`);
    render(false);
  }

  /* ---------- demo guide ---------- */
  function guideSteps() {
    const layla = 'E1001';
    const pendingAsg = () => {
      const mine = S().asgFor(layla).filter((a) => S().isOpen(a));
      const pick = mine.find((a) => a.policyId === 'GRP.05' && a.version === S().pol('GRP.05').version) || mine.sort((a, b) => (a.due < b.due ? -1 : 1))[0];
      return pick ? `#/read/${pick.id}` : '#/attestation';
    };
    const lastReceipt = () => {
      const done = S().asgFor(layla).filter((a) => a.status === 'Acknowledged').sort((a, b) => (a.ackAt < b.ackAt ? 1 : -1))[0];
      return done ? `#/receipt/${done.receipt}` : '#/my-policies';
    };
    const latestCampaign = () => { const c = S().state().campaigns.slice(-1)[0]; return `#/reports?campaign=${c.id}`; };
    return [
      { t: 'Open the Policy & Procedure landing page', d: 'Recreated intranet landing with search and filters.', go: () => '#/policies' },
      { t: 'Browse the Waha Investments department', d: 'Department folders, as on the existing intranet.', go: () => '#/policies/waha-investments' },
      { t: 'Open Risk Management', d: 'Folder view with the policy document listing.', go: () => '#/policies/waha-investments/RSK' },
      { t: 'View the Enterprise Risk Management Policy', d: 'Document page with metadata and version history.', go: () => '#/policy/RSK.01' },
      { t: 'Switch to the Employee persona', d: 'Layla Haddad, Risk Analyst.', persona: 'employee', go: () => null },
      { t: 'Open the Attestation Centre', d: 'Pending, completed and overdue policies with due dates.', persona: 'employee', go: () => '#/attestation' },
      { t: 'Read and acknowledge a pending policy', d: 'Timer, scroll-to-end, confirmation and initials (LH).', persona: 'employee', go: pendingAsg },
      { t: 'View the acknowledgement receipt', d: 'Reference, version, fingerprint and timestamp; printable.', persona: 'employee', go: lastReceipt },
      { t: 'Switch to Policy Owner', d: 'Sara Mansour, Head of Compliance.', persona: 'owner', go: () => '#/console' },
      { t: 'Create and launch a new campaign', d: 'Five-step wizard; assignments and notices are generated.', persona: 'owner', go: () => '#/campaigns/new' },
      { t: 'Open the Reporting Dashboard', d: 'KPIs and charts with filters and CSV export.', persona: 'owner', go: () => '#/reports' },
      { t: 'Show updated completion metrics', d: 'Filter to the campaign you just launched.', persona: 'owner', go: latestCampaign },
      { t: 'Simulate an overdue reminder or escalation', d: 'Use "Simulate workflow" or Manage → next step.', persona: 'owner', go: () => '#/campaigns/CMP-2026-001' },
      { t: 'Switch to Auditor', d: 'Daniel Clarke — read-only evidence access.', persona: 'auditor', go: () => null },
      { t: 'Open Audit Evidence and export records', d: 'Filter, view a record, export CSV, print a report.', persona: 'auditor', go: () => '#/audit' },
      { t: 'Return to the policy register', d: 'Back as Policy Owner in the console.', persona: 'owner', go: () => '#/console' },
    ];
  }
  function markGuideProgress(path) {
    const s = S().state().session;
    const steps = guideSteps();
    const p = S().persona().key;
    steps.forEach((st, i) => {
      const target = st.go();
      if (target && target.split('?')[0] === '#' + path && (!st.persona || st.persona === p) && !s.guideDone.includes(i)) s.guideDone.push(i);
    });
    S().persist();
  }
  function openGuide() {
    closePopover();
    const s = S().state().session;
    const steps = guideSteps();
    WA.openOverlay({
      title: 'Demo guide — 16 steps (10–15 minutes)', drawer: true,
      body: html`<p class="small muted" style="margin-top:0">Each <b>Go</b> button switches to the right persona and opens the screen. All data is fictional; use Reset demo data to start over.</p>
        <div class="progress" style="margin-bottom:12px">${raw(`<span style="width:${(s.guideDone.length / steps.length) * 100}%"></span>`)}</div>
        <ol class="guide-steps">${steps.map((st, i) => html`<li class="${s.guideDone.includes(i) ? 'done' : ''}"><span class="gn">${s.guideDone.includes(i) ? icon('check', 14) : i + 1}</span>
          <div><div class="gt">${st.t}</div><div class="gd">${st.d}${st.persona ? ` · ${WA.data.PERSONAS[st.persona].label}` : ''}</div></div>
          <button class="btn btn-secondary btn-sm" type="button" data-action="guide-go" data-step="${i}">Go</button></li>`)}</ol>`,
      foot: html`<button class="btn btn-ghost" type="button" data-action="guide-clear">Clear progress</button><span class="spacer"></span><button class="btn btn-primary" type="button" data-action="guide-go" data-step="${Math.min(steps.length - 1, s.guideDone.length ? Math.max(...s.guideDone) + 1 : 0)}">${s.guideDone.length ? 'Continue' : 'Start demo'} ${icon('arrow-right', 16)}</button>`,
    });
  }
  function guideGo(i) {
    const st = guideSteps()[i];
    if (!st) return;
    const s = S().state().session;
    WA.closeAllOverlays();
    if (st.persona && st.persona !== S().persona().key) {
      S().setPersona(st.persona);
      WA.toast(`Now viewing as ${S().persona().label} — ${S().user().name}.`);
    }
    if (!s.guideDone.includes(i)) s.guideDone.push(i);
    S().persist();
    const target = st.go();
    if (target && location.hash !== target) navigate(target);
    else render(true);
  }

  /* ---------- welcome ---------- */
  function maybeWelcome() {
    const s = S().state().session;
    if (s.welcomed) return;
    s.welcomed = true;
    S().persist();
    WA.openOverlay({
      title: 'Welcome to the Policy Attestation demo',
      body: html`<p style="margin-top:0">This interactive prototype shows how auditable policy read-and-acknowledge can be added to the existing Waha Capital intranet.</p>
        ${WA.alertBox('warn', 'alert', 'Fictional data only.', ' Names, IDs, policies, campaigns and metrics are invented. Microsoft 365 integrations are simulated in the browser.')}
        <ul class="info-list small">${Object.values(WA.data.PERSONAS).map((p) => html`<li><b>${p.label}</b> (${S().empName(p.userId)}): ${p.blurb}</li>`)}</ul>
        <p class="small muted">Switch persona from the header at any time. The guide button (book icon) walks through a 10–15 minute demonstration.</p>`,
      foot: html`<button class="btn btn-secondary" type="button" data-close>Explore on my own</button><button class="btn btn-primary" type="button" data-action="open-guide">${icon('book', 16)} Start guided demo</button>`,
    });
  }

  /* ---------- delegated events ---------- */
  const BUILTIN = {
    'open-sidebar': () => $('#app').classList.add('nav-open'),
    'close-sidebar': () => $('#app').classList.remove('nav-open'),
    'toggle-tree': () => { app.treeOpen = !app.treeOpen; renderSidebar(); },
    'toggle-notifs': (el) => (popover && popover.button === el ? closePopover() : notifPopover(el)),
    'toggle-user': (el) => (popover && popover.button === el ? closePopover() : userPopover(el)),
    'notif-read-all': () => { S().markAllRead(S().user().id); closePopover(); renderTopbar(); WA.toast('All notifications marked as read.'); },
    'set-persona': (el) => setPersona(el.dataset.persona),
    'open-guide': () => { WA.closeAllOverlays(); openGuide(); },
    'guide-go': (el) => guideGo(Number(el.dataset.step)),
    'guide-clear': () => { S().state().session.guideDone = []; S().persist(); WA.closeAllOverlays(); openGuide(); },
    'reset-demo': async () => {
      closePopover();
      const ok = await WA.confirmDialog({ title: 'Reset demo data?', message: 'All changes made in this browser — acknowledgements, campaigns, policy edits, outcomes and notifications — will be deleted and the original fictional dataset restored.', confirmLabel: 'Reset demo data', danger: true });
      if (!ok) return;
      WA.closeAllOverlays();
      const persona = S().persona().key;
      S().resetAll();
      S().setPersona(persona);
      S().state().session.welcomed = true;
      S().persistNow();
      WA.toast('Demo data reset to the original fictional scenario.');
      navigate('#/policies', true);
    },
  };
  document.addEventListener('click', (e) => {
    if (popover && !popover.el.contains(e.target) && !popover.button.contains(e.target)) closePopover();
    const el = e.target.closest('[data-action]');
    if (!el || el.disabled) return;
    const name = el.dataset.action;
    const fn = BUILTIN[name] || WA.handlers.click[name];
    if (!fn) return;
    if (el.tagName === 'A' && name === 'nc-open') { fn(el, e); closePopover(); return; }
    e.preventDefault();
    fn(el, e);
  });
  document.addEventListener('input', (e) => {
    const el = e.target.closest('[data-input]');
    if (el && WA.handlers.input[el.dataset.input]) WA.handlers.input[el.dataset.input](el, e);
  });
  document.addEventListener('change', (e) => {
    const el = e.target.closest('[data-change]');
    if (!el) return;
    if (el.dataset.change === 'persona') { setPersona(el.value); return; }
    if (WA.handlers.change[el.dataset.change]) WA.handlers.change[el.dataset.change](el, e);
  });
  document.addEventListener('submit', (e) => {
    const form = e.target.closest('[data-form]');
    if (!form) return;
    e.preventDefault();
    const name = form.dataset.form;
    if (name === 'global-search') {
      const q = form.querySelector('input').value.trim();
      WA.vh.addRecentSearch(q);
      navigate(`#/policies?q=${encodeURIComponent(q)}`, true);
      form.querySelector('input').value = '';
      return;
    }
    if (WA.handlers.submit[name]) WA.handlers.submit[name](form, e);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (popover) { const b = popover.button; closePopover(); b.focus(); }
      $('#app').classList.remove('nav-open');
    }
  });
  window.addEventListener('hashchange', () => { closePopover(); WA.closeAllOverlays(); render(true); });
  window.addEventListener('resize', WA.debounce(closePopover, 100));

  /* ---------- public API ---------- */
  Object.assign(app, {
    navigate,
    refresh: () => render(false),
    refreshChrome: renderChrome,
  });
  WA.app = app;

  /* ---------- boot ---------- */
  function boot() {
    S().init();
    // floating guide button
    const fab = document.createElement('button');
    fab.className = 'guide-fab';
    fab.type = 'button';
    fab.dataset.action = 'open-guide';
    fab.setAttribute('aria-label', 'Open demo guide');
    WA.setHTML(fab, html`${icon('book', 18)}<span>Demo Guide</span>`);
    document.body.appendChild(fab);
    if (!location.hash) history.replaceState(null, '', '#/policies');
    render(true);
    maybeWelcome();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
