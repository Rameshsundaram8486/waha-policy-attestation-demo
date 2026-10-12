/* Core utilities: safe HTML templating, dates, PRNG, CSV, toasts, modals, print.
   Every interpolated value in html`` is escaped unless explicitly wrapped in raw(). */
(function () {
  'use strict';
  const WA = (window.WA = window.WA || {});

  /* ---------- safe HTML ---------- */
  class SafeHtml {
    constructor(s) { this.s = s; }
    toString() { return this.s; }
  }
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' };
  const esc = (v) => String(v).replace(/[&<>"'`]/g, (c) => ESC[c]);
  const raw = (s) => new SafeHtml(s == null ? '' : String(s));
  function part(v) {
    if (v == null || v === false || v === true) return '';
    if (v instanceof SafeHtml) return v.s;
    if (Array.isArray(v)) return v.map(part).join('');
    return esc(v);
  }
  function html(strings, ...vals) {
    let out = strings[0];
    for (let i = 0; i < vals.length; i++) out += part(vals[i]) + strings[i + 1];
    return new SafeHtml(out);
  }
  function setHTML(el, content) { if (el) el.innerHTML = part(content); }

  /* ---------- dates (date-only strings are treated as UTC midnight) ---------- */
  const DAY = 86400000;
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const GST_OFFSET = 4 * 3600000; // Gulf Standard Time for display

  function parseDate(s) {
    if (s instanceof Date) return s;
    if (!s) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const [y, m, d] = s.split('-').map(Number);
      return new Date(Date.UTC(y, m - 1, d));
    }
    const d = new Date(s);
    return isNaN(d) ? null : d;
  }
  const isoDate = (d) => { d = parseDate(d); return d ? d.toISOString().slice(0, 10) : ''; };
  const addDays = (s, n) => isoDate(new Date(parseDate(isoDate(s)).getTime() + n * DAY));
  const diffDays = (a, b) => Math.round((parseDate(isoDate(a)) - parseDate(isoDate(b))) / DAY);
  function fmtDate(s, style) {
    const d = parseDate(s);
    if (!d) return '—';
    const day = d.getUTCDate(), m = d.getUTCMonth(), y = d.getUTCFullYear();
    if (style === 'long') return `${day} ${MONTHS[m]} ${y}`;
    return `${day} ${MONTHS[m].slice(0, 3)} ${y}`;
  }
  function fmtDateTime(s) {
    const d = parseDate(s);
    if (!d) return '—';
    const g = new Date(d.getTime() + GST_OFFSET);
    const hh = String(g.getUTCHours()).padStart(2, '0');
    const mm = String(g.getUTCMinutes()).padStart(2, '0');
    return `${fmtDate(g)}, ${hh}:${mm} GST`;
  }
  function relDays(n) {
    if (n === 0) return 'today';
    if (n === 1) return 'tomorrow';
    if (n === -1) return 'yesterday';
    return n > 0 ? `in ${n} days` : `${-n} days ago`;
  }

  /* ---------- deterministic PRNG ---------- */
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashString(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  /** 64-hex pseudo fingerprint (clearly labelled "simulated" in the UI). */
  function fingerprint(str) {
    let out = '';
    let h = hashString(str);
    const rnd = mulberry32(h);
    while (out.length < 64) out += Math.floor(rnd() * 16).toString(16);
    return out;
  }
  function randomId(len) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    const arr = new Uint32Array(len);
    (window.crypto || {}).getRandomValues ? window.crypto.getRandomValues(arr) : arr.forEach((_, i) => (arr[i] = Math.random() * 1e9));
    for (let i = 0; i < len; i++) s += chars[arr[i] % chars.length];
    return s;
  }

  /* ---------- misc ---------- */
  const pct = (n, d) => (d ? Math.round((n / d) * 1000) / 10 : 0);
  const fmtPct = (v) => `${Number.isInteger(v) ? v : v.toFixed(1)}%`;
  const plural = (n, one, many) => `${n.toLocaleString('en-GB')} ${n === 1 ? one : many || one + 's'}`;
  const initialsOf = (name) => String(name).split(/\s+/).filter(Boolean).map((p) => p[0]).join('').slice(0, 3).toUpperCase();
  const uniq = (arr) => [...new Set(arr)];
  const byKey = (k, dir = 1) => (a, b) => (a[k] > b[k] ? dir : a[k] < b[k] ? -dir : 0);
  function debounce(fn, ms) {
    let t;
    return function (...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), ms); };
  }
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  /* ---------- CSV ---------- */
  function csvCell(v) {
    let s = v == null ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // neutralise spreadsheet formula injection
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }
  function toCSV(rows, columns) {
    const head = columns.map((c) => csvCell(c.label)).join(',');
    const body = rows.map((r) => columns.map((c) => csvCell(typeof c.value === 'function' ? c.value(r) : r[c.value])).join(','));
    return '﻿' + [head, ...body].join('\r\n');
  }
  function download(filename, content, mime) {
    const blob = new Blob([content], { type: mime || 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  /* ---------- toasts ---------- */
  function toast(message, kind) {
    const stack = $('#toast-stack');
    if (!stack) return;
    const icon = kind === 'bad' ? 'alert' : kind === 'warn' ? 'info' : 'check-circle';
    const el = document.createElement('div');
    el.className = `toast toast--${kind || 'good'}`;
    el.setAttribute('role', kind === 'bad' ? 'alert' : 'status');
    el.innerHTML = part(html`${WA.icon ? WA.icon(icon, 18) : ''}<div>${message}</div>`);
    stack.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .25s'; }, 3800);
    setTimeout(() => el.remove(), 4200);
  }

  /* ---------- modal / drawer ---------- */
  const overlayStack = [];
  function trapFocus(container, e) {
    const f = $$('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])', container)
      .filter((x) => x.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  /**
   * open an overlay. opts: { title, body (SafeHtml), foot (SafeHtml), size, drawer, onMount(el, close), onClose }
   * returns close()
   */
  function openOverlay(opts) {
    const root = $('#overlay-root');
    const prevFocus = document.activeElement;
    const wrap = document.createElement('div');
    const titleId = 'ov-' + Math.random().toString(36).slice(2, 8);
    const panelCls = opts.drawer ? `drawer ${opts.size === 'wide' ? 'drawer--wide' : ''}` : `modal ${opts.size ? 'modal--' + opts.size : ''}`;
    const panel = html`
      <div class="${panelCls}" role="dialog" aria-modal="true" aria-labelledby="${titleId}" tabindex="-1">
        <div class="modal-head">
          <h2 id="${titleId}">${opts.title}</h2>
          <button class="icon-btn" type="button" data-close aria-label="Close">${WA.icon('x', 18)}</button>
        </div>
        <div class="modal-body">${opts.body}</div>
        ${opts.foot ? html`<div class="modal-foot">${opts.foot}</div>` : ''}
      </div>`;
    wrap.innerHTML = opts.drawer
      ? part(html`<div class="drawer-backdrop" data-close></div>${panel}`)
      : part(html`<div class="modal-backdrop" data-backdrop>${panel}</div>`);
    root.appendChild(wrap);
    document.body.style.overflow = 'hidden';
    const dialog = $('[role=dialog]', wrap);
    let closed = false;
    function close() {
      if (closed) return;
      closed = true;
      wrap.remove();
      const i = overlayStack.indexOf(entry);
      if (i >= 0) overlayStack.splice(i, 1);
      if (!overlayStack.length) document.body.style.overflow = '';
      if (opts.onClose) opts.onClose();
      if (prevFocus && prevFocus.focus && document.contains(prevFocus)) prevFocus.focus();
      else if (overlayStack.length) overlayStack[overlayStack.length - 1].el.focus();
    }
    const entry = { close, el: dialog };
    overlayStack.push(entry);
    wrap.addEventListener('click', (e) => {
      if (e.target.closest('[data-close]')) close();
      else if (e.target.hasAttribute('data-backdrop')) close();
    });
    wrap.addEventListener('keydown', (e) => { if (e.key === 'Tab') trapFocus(dialog, e); });
    if (opts.onMount) opts.onMount(dialog, close);
    const autofocus = $('[autofocus]', dialog) || $('input:not([type=hidden]):not([disabled]),select,textarea', dialog) || $('[data-close]', dialog);
    if (autofocus) setTimeout(() => autofocus.focus(), 20);
    return close;
  }
  // Escape always closes the topmost overlay, even when focus has fallen back to <body>
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlayStack.length) { e.stopPropagation(); overlayStack[overlayStack.length - 1].close(); }
  }, true);
  function closeAllOverlays() { [...overlayStack].reverse().forEach((o) => o.close()); }

  function confirmDialog({ title, message, confirmLabel, danger, details }) {
    return new Promise((resolve) => {
      let result = false;
      const close = openOverlay({
        title,
        size: 'sm',
        body: html`<p style="margin:0">${message}</p>${details ? html`<div class="alert alert--warn" style="margin:14px 0 0">${WA.icon('alert', 18)}<div>${details}</div></div>` : ''}`,
        foot: html`<button class="btn btn-secondary" type="button" data-close>Cancel</button>
                   <button class="btn ${danger ? 'btn-danger-solid' : 'btn-primary'}" type="button" data-confirm autofocus>${confirmLabel || 'Confirm'}</button>`,
        onMount(el, closeFn) {
          $('[data-confirm]', el).addEventListener('click', () => { result = true; closeFn(); });
        },
        onClose() { resolve(result); },
      });
      return close;
    });
  }

  /* ---------- print ---------- */
  function printHTML(content, title) {
    const root = $('#print-root');
    setHTML(root, content);
    const prevTitle = document.title;
    if (title) document.title = title;
    const cleanup = () => {
      document.title = prevTitle;
      setTimeout(() => setHTML(root, ''), 300);
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    setTimeout(() => window.print(), 50);
  }

  /* ---------- form helpers ---------- */
  function formData(form) {
    const out = {};
    new FormData(form).forEach((v, k) => {
      if (k in out) out[k] = [].concat(out[k], v);
      else out[k] = typeof v === 'string' ? v.trim() : v;
    });
    return out;
  }
  /** rules: { name: { required, label, test(v, data) -> message|null } } */
  function validateForm(form, rules) {
    const data = formData(form);
    let firstBad = null;
    $$('.field', form).forEach((f) => { f.classList.remove('invalid'); const e = $('.error-text', f); if (e) e.remove(); });
    Object.entries(rules).forEach(([name, rule]) => {
      const v = data[name];
      let msg = null;
      if (rule.required && (v == null || v === '' || (Array.isArray(v) && !v.length))) msg = `${rule.label || name} is required.`;
      else if (rule.test) msg = rule.test(v, data);
      if (msg) {
        const input = form.querySelector(`[name="${name}"]`);
        const field = input && input.closest('.field');
        if (field) {
          field.classList.add('invalid');
          const e = document.createElement('div');
          e.className = 'error-text';
          e.textContent = msg;
          field.appendChild(e);
          if (input) input.setAttribute('aria-invalid', 'true');
        }
        if (!firstBad) firstBad = input;
      } else {
        const input = form.querySelector(`[name="${name}"]`);
        if (input) input.removeAttribute('aria-invalid');
      }
    });
    if (firstBad) { firstBad.focus(); return null; }
    return data;
  }

  Object.assign(WA, {
    SafeHtml, html, raw, esc, setHTML,
    DAY, parseDate, isoDate, addDays, diffDays, fmtDate, fmtDateTime, relDays,
    mulberry32, hashString, fingerprint, randomId,
    pct, fmtPct, plural, initialsOf, uniq, byKey, debounce, $, $$,
    toCSV, download, toast, openOverlay, closeAllOverlays, confirmDialog, printHTML,
    formData, validateForm,
  });
})();
