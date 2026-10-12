/* Reusable UI building blocks. Icons are inline SVG paths adapted from Lucide (ISC licence),
   bundled locally so the demo never depends on an icon CDN. */
(function () {
  'use strict';
  const WA = window.WA;
  const { html, raw } = WA;

  const P = {
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    'chevron-right': '<path d="m9 18 6-6-6-6"/>',
    'chevron-left': '<path d="m15 18-6-6 6-6"/>',
    'chevron-down': '<path d="m6 9 6 6 6-6"/>',
    'chevron-up': '<path d="m18 15-6-6-6 6"/>',
    grid: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
    network: '<rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/><path d="M12 12V8"/>',
    building: '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>',
    file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
    'file-check': '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="m9 15 2 2 4-4"/>',
    'clipboard-check': '<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
    megaphone: '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
    chart: '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    'user-plus': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6"/><path d="M22 11h-6"/>',
    'user-x': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m17 8 5 5"/><path d="m22 8-5 5"/>',
    calendar: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
    'calendar-plus': '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/><path d="M12 14v4"/><path d="M10 16h4"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    'check-circle': '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
    printer: '<path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"/><rect x="6" y="14" width="12" height="8" rx="1"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    pencil: '<path d="M21.17 6.81a1 1 0 0 0-3.99-3.99L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5z"/><path d="m15 5 4 4"/>',
    eye: '<path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0"/><circle cx="12" cy="12" r="3"/>',
    history: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
    send: '<path d="M14.54 21.69a.5.5 0 0 0 .94-.03l6.5-19a.5.5 0 0 0-.64-.64l-19 6.5a.5.5 0 0 0-.03.94l7.93 3.18a2 2 0 0 1 1.11 1.11z"/><path d="m21.85 2.15-10.94 10.94"/>',
    'arrow-up': '<circle cx="12" cy="12" r="10"/><path d="m16 12-4-4-4 4"/><path d="M12 16V8"/>',
    'arrow-left': '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    'arrow-right': '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    play: '<polygon points="6 3 20 12 6 21 6 3"/>',
    'skip-forward': '<polygon points="5 4 15 12 5 20 5 4"/><line x1="19" x2="19" y1="5" y2="19"/>',
    reset: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    lock: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    home: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    menu: '<line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/>',
    archive: '<rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/>',
    hash: '<line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/>',
    ban: '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>',
    layers: '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
    zap: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
    sliders: '<line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/>',
    'log-out': '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
    filter: '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
    target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    percent: '<line x1="19" x2="5" y1="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
    inbox: '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    folder: '<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>',
    'file-signature': '<path d="M20 19.5v.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8.5L18 5.5"/><path d="M8 18h1"/><path d="M18.42 9.61a2.1 2.1 0 1 1 2.97 2.97L16.95 17 13 18l.99-3.95 4.43-4.44Z"/>',
  };

  function icon(name, size, cls) {
    const s = size || 20;
    if (name === 'folder-solid') {
      return raw(`<svg class="${cls || ''}" width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M3 5.5A1.5 1.5 0 0 1 4.5 4h4.38c.4 0 .78.16 1.06.44L11.5 6H19.5A1.5 1.5 0 0 1 21 7.5v10A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5Z"/></svg>`);
    }
    if (name === 'pdf') {
      return raw(`<svg class="${cls || ''}" width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 2h9l5 5v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" fill="#fff" stroke="#c9d0d2"/><path d="M15 2v5h5" fill="none" stroke="#c9d0d2"/><rect x="3" y="12" width="4" height="4" fill="#d9534f"/><rect x="17" y="12" width="4" height="4" fill="#d9534f"/><rect x="8.5" y="11" width="7" height="6" rx="1.5" fill="none" stroke="#d9534f" stroke-width="2"/></svg>`);
    }
    const p = P[name] || P.info;
    return raw(`<svg class="${cls || ''}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${p}</svg>`);
  }

  /* folder illustration from the existing intranet cards */
  const folderArt = () => raw(`<svg class="folder-art" width="124" height="88" viewBox="0 0 124 88" aria-hidden="true">
      <path d="M4 10a6 6 0 0 1 6-6h30l8 8h66a6 6 0 0 1 6 6v62a6 6 0 0 1-6 6H10a6 6 0 0 1-6-6Z" fill="#fff" opacity=".95"/>
      <rect x="12" y="30" width="50" height="9" rx="2" fill="#bfe7e7"/><rect x="68" y="30" width="44" height="9" rx="2" fill="#d4dcdc"/>
    </svg>`);
  const pdfArt = () => raw(`<svg class="folder-art" width="96" height="78" viewBox="0 0 96 78" aria-hidden="true">
      <rect x="18" y="0" width="60" height="74" rx="2" fill="#fff" stroke="#8c9799" stroke-width="2"/>
      <path d="M26 10h44M26 16h44M26 22h44" stroke="#8c9799" stroke-width="2"/>
      <rect x="0" y="40" width="20" height="16" fill="#d9534f"/><rect x="76" y="40" width="20" height="16" fill="#d9534f"/>
      <rect x="32" y="34" width="32" height="28" rx="7" fill="none" stroke="#d9534f" stroke-width="5"/>
    </svg>`);

  /* ---------- status badges ---------- */
  const STATUS_CLASS = {
    Pending: 'pending', 'In Progress': 'progress', Acknowledged: 'ack', Overdue: 'overdue', Exempted: 'exempt',
    'Non-compliant': 'noncompliant', Withdrawn: 'neutral',
    Published: 'ack', Draft: 'draft', 'Under Review': 'progress', Archived: 'neutral',
    Active: 'teal', Scheduled: 'progress', Closed: 'neutral',
    'Review overdue': 'overdue', 'Due in 7 days': 'overdue', 'Due in 30 days': 'pending', 'Due in 60 days': 'progress', Current: 'ack',
    'On time': 'ack', 'Acknowledged late': 'pending', Extended: 'progress',
  };
  const badge = (status, extraCls) => html`<span class="badge badge--${STATUS_CLASS[status] || 'neutral'} ${extraCls || ''}">${status}</span>`;
  const simBadge = (label) => html`<span class="badge badge--sim badge--plain">${icon('zap', 12)} ${label || 'Simulated'}</span>`;
  const pills = (list) => html`<ul class="pill-list">${[].concat(list || []).map((x) => html`<li>${x}</li>`)}</ul>`;
  const avatar = (name, size) => html`<span class="avatar ${size ? 'avatar--' + size : ''}" aria-hidden="true">${WA.initialsOf(name || '?')}</span>`;

  function kpi({ label, value, sub, iconName, tone, bar }) {
    return html`<div class="kpi ${tone ? 'kpi--' + tone : ''}">
      <div class="kpi-label">${icon(iconName || 'info', 16)}<span>${label}</span></div>
      <div class="kpi-value">${value}</div>
      ${sub ? html`<div class="kpi-sub">${sub}</div>` : ''}
      ${bar != null ? html`<div class="kpi-bar">${progress(bar)}</div>` : ''}
    </div>`;
  }
  function progress(value, tone) {
    const v = Math.max(0, Math.min(100, Number(value) || 0));
    const t = tone || (v >= 85 ? 'good' : v >= 60 ? '' : v >= 35 ? 'warn' : 'bad');
    return html`<div class="progress ${t ? 'progress--' + t : ''}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(v)}"><span style="width:${v}%"></span></div>`;
  }
  const meter = (value) => html`<div class="meter">${progress(value)}<b>${WA.fmtPct(value)}</b></div>`;

  function emptyState(title, text, iconName) {
    return html`<div class="empty"><div class="empty-ico">${icon(iconName || 'inbox', 26)}</div><h3>${title}</h3>${text ? html`<p>${text}</p>` : ''}</div>`;
  }
  function alertBox(kind, iconName, title, text, action) {
    return html`<div class="alert alert--${kind}" role="${kind === 'bad' ? 'alert' : 'note'}">${icon(iconName, 20)}<div>${title ? html`<strong>${title}</strong>` : ''}${text}</div>${action || ''}</div>`;
  }

  function crumbs(items) {
    const out = [html`<a href="#/home" aria-label="Intranet home">${icon('grid', 20)}</a>`];
    items.forEach((it, i) => {
      out.push(html`<span class="sep" aria-hidden="true">${icon('chevron-right', 16)}</span>`);
      const last = i === items.length - 1;
      const inner = html`${it.folder ? html`<span class="crumb-folder">${icon('folder-solid', 22)}</span>` : ''}${it.label}`;
      out.push(last || !it.href ? html`<span class="${last ? 'current' : ''}" ${last ? raw('aria-current="page"') : ''}>${inner}</span>` : html`<a href="${it.href}">${inner}</a>`);
    });
    return html`<nav class="crumbs" aria-label="Breadcrumb">${out}</nav>`;
  }

  /* ---------- pagination ---------- */
  function paginate(list, page, size) {
    const pages = Math.max(1, Math.ceil(list.length / size));
    const p = Math.min(Math.max(1, page || 1), pages);
    return { items: list.slice((p - 1) * size, p * size), page: p, pages, total: list.length, size };
  }
  function pager(pg, action) {
    if (pg.total === 0) return '';
    const nums = [];
    const add = (n) => nums.push(html`<button type="button" class="${n === pg.page ? 'current' : ''}" data-action="${action}" data-page="${n}" aria-label="Page ${n}" ${n === pg.page ? raw('aria-current="page"') : ''}>${n}</button>`);
    const win = 2;
    for (let n = 1; n <= pg.pages; n++) {
      if (n === 1 || n === pg.pages || Math.abs(n - pg.page) <= win) add(n);
      else if (Math.abs(n - pg.page) === win + 1) nums.push(html`<span class="muted">…</span>`);
    }
    const from = (pg.page - 1) * pg.size + 1, to = Math.min(pg.total, pg.page * pg.size);
    return html`<div class="pager" role="navigation" aria-label="Pagination">
        <button type="button" data-action="${action}" data-page="${pg.page - 1}" ${pg.page <= 1 ? raw('disabled') : ''}>Previous</button>
        ${nums}
        <button type="button" data-action="${action}" data-page="${pg.page + 1}" ${pg.page >= pg.pages ? raw('disabled') : ''}>Next</button>
      </div><div class="pager-info">Showing ${from}–${to} of ${pg.total.toLocaleString('en-GB')}</div>`;
  }

  /* ---------- charts (Chart.js with accessible table fallback) ---------- */
  const charts = new Map();
  const STATUS_COLORS = {
    Acknowledged: '#1f8a5b', 'In Progress': '#2a78d6', Pending: '#eda100', Overdue: '#d03b3b', 'Non-compliant': '#6250d6', Exempted: '#e87ba4',
  };
  function destroyCharts() { charts.forEach((c) => { try { c.destroy(); } catch (e) { /* ignore */ } }); charts.clear(); }

  /**
   * chartCard({ id, title, sub, type: 'bar'|'hbar'|'stacked', labels, datasets:[{label,data,color}], percent, height })
   * Returns markup; call WA.mountCharts() after inserting into the DOM.
   */
  const pending = [];
  function chartCard(cfg) {
    pending.push(cfg);
    const multi = cfg.datasets.length > 1;
    const legend = multi ? html`<div class="legend">${cfg.datasets.map((d) => html`<span><i style="background:${d.color}"></i>${d.label}</span>`)}</div>` : '';
    const table = html`<details class="data-table"><summary>Show data table</summary>
        <div class="table-wrap" style="margin-top:6px"><table class="table table--compact"><thead><tr><th>${cfg.axisLabel || 'Category'}</th>${cfg.datasets.map((d) => html`<th class="num">${d.label}</th>`)}</tr></thead>
        <tbody>${cfg.labels.map((l, i) => html`<tr><td>${l}</td>${cfg.datasets.map((d) => html`<td class="num">${cfg.percent ? WA.fmtPct(d.data[i]) : d.data[i]}</td>`)}</tr>`)}</tbody></table></div></details>`;
    return html`<section class="card chart-card" aria-labelledby="${cfg.id}-t">
        <div class="card-head"><div><h3 id="${cfg.id}-t">${cfg.title}</h3>${cfg.sub ? html`<div class="sub">${cfg.sub}</div>` : ''}</div></div>
        <div class="card-body">${legend}
          <div class="chart-box ${cfg.small ? 'chart-box--sm' : ''}" style="${cfg.height ? 'height:' + cfg.height + 'px' : ''}"><canvas id="${cfg.id}" role="img" aria-label="${cfg.title}"></canvas><div class="chart-fallback" hidden></div></div>
          ${table}
        </div></section>`;
  }
  function mountCharts() {
    const list = pending.splice(0);
    list.forEach((cfg) => {
      const canvas = document.getElementById(cfg.id);
      if (!canvas) return;
      if (!window.Chart) { renderFallback(canvas, cfg); return; }
      const horizontal = cfg.type === 'hbar' || cfg.type === 'stacked';
      const stacked = cfg.type === 'stacked';
      const fmt = (v) => (cfg.percent ? WA.fmtPct(v) : Number(v).toLocaleString('en-GB'));
      const ds = cfg.datasets.map((d) => ({
        label: d.label, data: d.data, backgroundColor: d.color, borderColor: '#ffffff', borderWidth: stacked ? { right: 2 } : 0,
        borderRadius: stacked ? 0 : 4, borderSkipped: 'start', maxBarThickness: 26, categoryPercentage: 0.8, barPercentage: 0.85,
      }));
      const valueAxis = {
        beginAtZero: true, stacked, max: cfg.percent && !stacked ? 100 : cfg.max,
        grid: { color: '#edf1f2' }, border: { display: false },
        ticks: { color: '#5f7579', font: { size: 11 }, callback: (v) => (cfg.percent ? v + '%' : v) },
      };
      const catAxis = { stacked, grid: { display: false }, border: { color: '#c7d2d4' }, ticks: { color: '#17363a', font: { size: 11.5 }, autoSkip: false } };
      try {
        const chart = new window.Chart(canvas, {
          type: 'bar',
          data: { labels: cfg.labels, datasets: ds },
          options: {
            indexAxis: horizontal ? 'y' : 'x',
            responsive: true, maintainAspectRatio: false, animation: { duration: 250 },
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: '#03262b', padding: 10, cornerRadius: 6, displayColors: cfg.datasets.length > 1,
                callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${fmt(horizontal ? ctx.parsed.x : ctx.parsed.y)}` },
              },
            },
            scales: horizontal ? { x: valueAxis, y: catAxis } : { x: catAxis, y: valueAxis },
          },
        });
        charts.set(cfg.id, chart);
      } catch (e) {
        renderFallback(canvas, cfg);
      }
    });
  }
  function renderFallback(canvas, cfg) {
    const box = canvas.parentElement;
    canvas.hidden = true;
    box.style.height = 'auto';
    const fb = box.querySelector('.chart-fallback');
    fb.hidden = false;
    const d0 = cfg.datasets[0];
    const max = cfg.percent ? 100 : Math.max(1, ...cfg.datasets.map((d) => Math.max(...d.data)));
    WA.setHTML(fb, html`${cfg.labels.map((l, i) => html`<div class="hbar"><span>${l}</span><div class="track"><div class="fill" style="width:${(d0.data[i] / max) * 100}%;background:${d0.color}"></div></div><b>${cfg.percent ? WA.fmtPct(d0.data[i]) : d0.data[i]}</b></div>`)}
      <p class="muted small">Interactive charts need the Chart.js CDN; showing a simplified view.</p>`);
  }

  /* ---------- view + event registry (delegated handlers keyed by data-action / data-input / ...) ---------- */
  const views = {};
  const handlers = { click: {}, input: {}, change: {}, submit: {} };
  function handle(type, name, fn) { handlers[type][name] = fn; }

  Object.assign(WA, {
    views, handlers, handle,
    icon, folderArt, pdfArt, badge, simBadge, pills, avatar, kpi, progress, meter, emptyState, alertBox, crumbs,
    paginate, pager, chartCard, mountCharts, destroyCharts, STATUS_COLORS,
  });
})();
