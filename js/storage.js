/* LocalStorage persistence for the demo.
   NOTE: browser storage is editable by the user and is NOT immutable. Audit locking, tamper
   resistance and Purview retention are simulated here and must be implemented with SharePoint
   item-level permissions and Microsoft Purview record labels in the real Microsoft 365 tenant. */
(function () {
  'use strict';
  const WA = window.WA;
  const KEY = 'waha-policy-attestation-demo';
  let available = true;
  let warned = false;

  function probe() {
    try {
      const k = KEY + ':probe';
      localStorage.setItem(k, '1');
      localStorage.removeItem(k);
      return true;
    } catch (e) {
      return false;
    }
  }

  function load() {
    available = probe();
    if (!available) return null;
    try {
      const rawState = localStorage.getItem(KEY);
      if (!rawState) return null;
      const state = JSON.parse(rawState);
      if (!state || state.schema !== WA.data.SCHEMA) return null; // older or foreign data: reseed
      return state;
    } catch (e) {
      return null;
    }
  }

  function save(state) {
    if (!available) {
      if (!warned) { warned = true; WA.toast('Browser storage is unavailable — changes will last until you close this tab.', 'warn'); }
      return false;
    }
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      if (!warned) { warned = true; WA.toast('Could not save demo changes to browser storage (quota or privacy settings).', 'warn'); }
      return false;
    }
  }

  function clear() {
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
  }

  function size() {
    try { return (localStorage.getItem(KEY) || '').length; } catch (e) { return 0; }
  }

  WA.storage = { KEY, load, save, clear, size, isAvailable: () => available };
})();
