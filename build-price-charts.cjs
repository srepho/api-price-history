// Rebuild the portable HTML. Run: node build-price-charts.cjs
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const read = name => fs.readFileSync(path.join(__dirname, name), 'utf8');
const evidence = JSON.parse(read('api-price-charts.sources.json'));
const fx = JSON.parse(read('api-price-charts.fx.json'));
const rates = Object.entries(fx.rates).sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => [date, value.AUD]);
assert.equal(fx.base, 'USD');
assert(rates.length && rates.every(([d, r]) => /^\d{4}-\d{2}-\d{2}$/.test(d) && Number.isFinite(r) && r > 0));
const json = value => JSON.stringify(value).replace(/</g, '\\u003c');
const html = read('api-price-charts.template.html').replace('/*FX*/', json(rates)).replace('/*EVIDENCE*/', json(evidence));
const script = html.split('<script>')[1].split('</script>')[0];
new vm.Script(script);
const vendors = vm.runInNewContext(script.slice(0, script.indexOf('const line=')) + '; VENDORS');
const expected = [];
for (const [vi, v] of vendors.entries()) for (const s of v.series) for (const st of s.steps) {
  const key = `${vi}|${s.name}|${st[0]}`;
  expected.push(key);
  const row = evidence.rows[key];
  assert(row?.status && row?.note && Array.isArray(row.sources), `Missing evidence: ${key}`);
  for (const id of row.sources) assert(/^https:\/\//.test(evidence.sources[id]?.url), `Invalid source: ${id}`);
}
assert.deepEqual(Object.keys(evidence.rows).sort(), expected.sort());
fs.writeFileSync(path.join(__dirname, 'api-price-charts.html'), html);
console.log(`Built API price charts: ${rates.length} FX observations; ${expected.length} evidence records.`);
