// Message contract between the host page (host.html) and each pane (runtime.html?pane=A). docs/INTERFACES.md §11.
//
// Under file:// every page has an opaque origin and the panes are cross-origin iframes, so the two sides talk only
// through postMessage. Every message is a plain object tagged { cgfLink: 1, type, pane }. Neither side trusts the
// origin; the host checks event.source against the iframe's window, and the pane checks it against window.parent.
//
// validateMessage returns an array of error strings; an empty array means valid.
(function () {
  'use strict';
  const CGF = window.CGF = window.CGF || {};

  const PROTOCOL = 1;
  const PANE_RE = /^[A-Z]$/;

  // type -> direction and required payload fields
  const TYPES = {
    // pane to host
    hello:  { from: 'pane', fields: { api: 'object' } },                                  // runtime booted; api = { ok, missing: [] }
    ready:  { from: 'pane', fields: { scenario: 'string', domain: 'string', platform: 'object', crew: 'array' } },
    status: { from: 'pane', fields: { t: 'number', running: 'boolean', outcome: 'nullable-string', stats: 'object' } },
    ended:  { from: 'pane', fields: { outcome: 'string', text: 'string' } },
    record: { from: 'pane', fields: { record: 'object' } },                               // the INTERFACES §9.1 session record, once per adaptive run
    error:  { from: 'pane', fields: { message: 'string' } },
    // host to pane
    init:    { from: 'host', fields: { config: 'object' } },                               // a §3 scenario config
    start:   { from: 'host', fields: {} },
    pause:   { from: 'host', fields: {} },
    restart: { from: 'host', fields: {} },
    // reserved for the adaptation loop (Engine lane); not sent yet
    events:  { from: 'pane', fields: { events: 'array' } },
    apply:   { from: 'host', fields: { adjustments: 'array' } }
  };

  const check = (v, kind) => kind === 'object' ? (v !== null && typeof v === 'object' && !Array.isArray(v))
    : kind === 'array' ? Array.isArray(v)
    : kind === 'nullable-string' ? (v === null || typeof v === 'string')
    : kind === 'number' ? (typeof v === 'number' && Number.isFinite(v))
    : typeof v === kind;

  function validateMessage(m) {
    if (m === null || typeof m !== 'object' || Array.isArray(m)) return ['message: must be an object'];
    if (m.cgfLink !== PROTOCOL) return [`message: cgfLink must be ${PROTOCOL}`];
    const def = TYPES[m.type];
    if (!def) return [`message: unknown type "${m.type}"`];
    const errs = [];
    if (typeof m.pane !== 'string' || !PANE_RE.test(m.pane)) errs.push('message.pane: one capital letter required');
    for (const [k, kind] of Object.entries(def.fields)) if (!check(m[k], kind)) errs.push(`${m.type}.${k}: ${kind} required`);
    return errs;
  }

  // Build a message. The caller supplies the payload; the tag and pane are added here.
  const message = (type, pane, payload) => Object.assign({ cgfLink: PROTOCOL, type, pane }, payload || {});

  CGF.link = { PROTOCOL, TYPES, validateMessage, message };
})();
