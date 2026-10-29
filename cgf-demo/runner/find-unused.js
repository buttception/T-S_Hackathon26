// Lists files in the repo that no page reaches. Usage (from cgf-demo/): node runner/find-unused.js . unused.json
// Starts from the top-level pages plus config.js and counts a file as used when another file's text names it.
// It finds files nothing refers to; it cannot prove a referenced file runs. Needs Node. Owner: JL (runner/).
const fs = require('fs'), path = require('path'), cp = require('child_process');
const root = process.argv[2];
const files = cp.execSync('git ls-files', { cwd: root }).toString().trim().split('\n').filter(f => !f.startsWith('design/previews/'));
const text = {};
for (const f of files) if (/\.(js|html|css|md|ps1)$/.test(f)) text[f] = fs.readFileSync(path.join(root, f), 'utf8');
const quotes = ['"', "'", '`', '/', '(', ' '], after = ['"', "'", '`', ')', ' ', ',', ':'];
function mentions(t, base) {
  let i = -1;
  while ((i = t.indexOf(base, i + 1)) !== -1) {
    const b = t[i - 1], a = t[i + base.length];
    if ((b === undefined || quotes.includes(b)) && (a === undefined || after.includes(a))) return true;
  }
  return false;
}
const refs = {};
for (const f of Object.keys(text)) {
  refs[f] = new Set();
  const t = text[f], dir = path.posix.dirname(f);
  for (const g of files) {
    if (g === f) continue;
    const rel = path.posix.relative(dir, g);
    let hit = t.includes(rel) && (rel.includes('/') || mentions(t, rel));
    if (!hit && t.includes(g)) hit = true;
    if (!hit && /\.(js|css|html)$/.test(g)) hit = mentions(t, path.posix.basename(g));
    if (hit) refs[f].add(g);
  }
}
const kind = f => (/^docs\//.test(f) || /\.md$/.test(f)) ? 'doc' : /^tests\//.test(f) ? 'test' : 'code';
const roots = files.filter(f => /^[^/]+\.html$/.test(f));
function reach(rs, allow) {
  const seen = new Set(rs), q = [...rs];
  while (q.length) { const f = q.pop(); for (const g of (refs[f] || [])) { if (seen.has(g) || !allow(f, g)) continue; seen.add(g); q.push(g); } }
  return seen;
}
const prod = reach(roots.concat(['config.js']), (f, g) => kind(f) === 'code' && kind(g) === 'code');
const withTests = reach(roots.concat(files.filter(f => /^tests\/.*\.html$/.test(f))), (f, g) => kind(f) !== 'doc');
const out = { roots, prod: [...prod].sort(), edges: Object.fromEntries(Object.entries(refs).map(([k, v]) => [k, [...v]])) };
fs.writeFileSync(process.argv[3], JSON.stringify(out, null, 1));
console.log('reachable from the pages:', prod.size, 'of', files.length);
for (const f of files.filter(f => !prod.has(f))) {
  const by = Object.keys(refs).filter(k => refs[k].has(f) && k !== f);
  console.log(f.padEnd(50), withTests.has(f) ? '[tests]' : '       ', '<-', by.slice(0, 3).join(', ') || 'NOTHING');
}
