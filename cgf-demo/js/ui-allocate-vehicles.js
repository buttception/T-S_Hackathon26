// Vehicle diagrams for the allocation page: a top-down schematic of the chosen platform type with a marker for every
// trainee seat, so the instructor sees where each trainee sits. Inline SVG, so it works from file:// with no assets.
// The drawings are schematic, not accurate plans. Seats nobody can fill (the gunner and loader of a tank) are drawn
// as dashed markers, because the exercise simulates them.
//
// Colours come from the design tokens in css/style.css (var(--...)). Eevee can move them into allocate.css.
(function () {
  'use strict';
  const CGF = window.CGF;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const BODY = 'fill:var(--panel2);stroke:var(--muted);stroke-width:1.5';
  const PART = 'fill:var(--panel);stroke:var(--muted);stroke-width:1';
  const NOTE = 'fill:var(--muted);font-size:8px;text-anchor:middle';

  // All shapes face right (the bow, nose or gun points to the right edge). viewBox is 0 0 240 100.
  const TYPES = {
    fighter: {
      title: 'Fighter, top view', box: '0 0 240 100',
      shapes: [
        `<path style="${PART}" d="M120 44 L70 8 L92 8 L150 44 Z"/>`,
        `<path style="${PART}" d="M120 56 L70 92 L92 92 L150 56 Z"/>`,
        `<path style="${PART}" d="M30 45 L14 28 L26 28 L48 45 Z"/>`,
        `<path style="${PART}" d="M30 55 L14 72 L26 72 L48 55 Z"/>`,
        `<path style="${BODY}" d="M18 45 L150 43 L222 50 L150 57 L18 55 Z"/>`,
        `<ellipse style="${PART}" cx="145" cy="50" rx="30" ry="5.5"/>`
      ],
      seats: { pilot: [160, 50], weapon: [128, 50] },
      simulated: []
    },
    warship: {
      title: 'Warship, top view', box: '0 22 240 64',
      shapes: [
        `<path style="${BODY}" d="M12 36 L178 36 L230 50 L178 64 L12 64 Z"/>`,
        `<rect style="${PART}" x="16" y="41" width="40" height="18" rx="3" stroke-dasharray="4 3"/>`,
        `<text style="${NOTE}" x="36" y="73">helideck</text>`,
        `<rect style="${PART}" x="72" y="40" width="58" height="20" rx="3" stroke-dasharray="4 3"/>`,
        `<text style="${NOTE}" x="101" y="73">CIC (below deck)</text>`,
        `<rect style="${PART}" x="140" y="41" width="34" height="18" rx="3"/>`,
        `<text style="${NOTE}" x="166" y="73">bridge</text>`,
        `<circle style="${PART}" cx="200" cy="50" r="4"/>`
      ],
      seats: { weapons: [85, 50], sensors: [114, 50], navigation: [157, 50] },
      simulated: []
    },
    tank: {
      title: 'Tank, top view', box: '0 14 240 72',
      shapes: [
        `<rect style="${PART}" x="26" y="20" width="158" height="12" rx="3"/>`,
        `<rect style="${PART}" x="26" y="68" width="158" height="12" rx="3"/>`,
        `<rect style="${BODY}" x="30" y="28" width="150" height="44" rx="6"/>`,
        `<rect style="${PART}" x="150" y="46.5" width="84" height="7"/>`,
        `<ellipse style="${BODY}" cx="112" cy="50" rx="44" ry="25"/>`
      ],
      seats: { commander: [122, 61], driver: [164, 50] },
      simulated: [[122, 39, 'Gunner (simulated)'], [92, 56, 'Loader (simulated)']]
    }
  };

  const initials = name => String(name || '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');

  // people: { seat: { name, active } } for the seats that have a trainee or are the active seat.
  // Returns an SVG string. The seat markers carry data-seat so the page can make them clickable.
  function svg(type, people) {
    const t = TYPES[type];
    if (!t) return '';
    people = people || {};
    const dots = Object.entries(t.seats).map(([seat, [x, y]], i) => {
      const who = people[seat] || {}, filled = !!who.name, active = !!who.active;
      const fill = filled ? 'var(--accent)' : 'var(--panel)';
      const stroke = active ? 'var(--text)' : filled ? 'var(--accent)' : 'var(--muted)';
      const text = filled ? initials(who.name) : String(i + 1);
      const label = `${seat}${filled ? ': ' + who.name : ': empty'}`;
      return `<g class="seatDot" data-seat="${esc(seat)}" style="cursor:pointer"><title>${esc(label)}</title>` +
        `<circle cx="${x}" cy="${y}" r="10" style="fill:${fill};stroke:${stroke};stroke-width:${active ? 2.5 : 1.5}${filled ? '' : ';stroke-dasharray:3 2'}"/>` +
        `<text x="${x}" y="${y + 3.5}" style="font-size:10px;font-weight:700;text-anchor:middle;fill:${filled ? 'var(--bg)' : 'var(--muted)'};pointer-events:none">${esc(text)}</text></g>`;
    }).join('');
    const sims = t.simulated.map(([x, y, label]) =>
      `<g><title>${esc(label)}</title><circle cx="${x}" cy="${y}" r="7" style="fill:none;stroke:var(--muted);stroke-width:1;stroke-dasharray:2 2"/>` +
      `<text x="${x}" y="${y + 3}" style="font-size:8px;text-anchor:middle;fill:var(--muted)">S</text></g>`).join('');
    return `<svg class="vehicle" viewBox="${t.box}" width="100%" role="img" aria-label="${esc(t.title)}, crew" data-type="${esc(type)}">` +
      t.shapes.join('') + sims + dots + '</svg>';
  }

  CGF.vehicles = { TYPES, svg, initials, seatsOf: type => (TYPES[type] ? Object.keys(TYPES[type].seats) : []) };
})();
