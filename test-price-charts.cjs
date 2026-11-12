// Dependency-free calculation and generated-markup regressions; not browser layout tests.
// Run after building: node test-price-charts.cjs
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync(path.join(__dirname, 'api-price-charts.html'), 'utf8');
const script = html.split('<script>')[1].split('</script>')[0];
function fixture(hash = '') {
  const ids = new Map();
  class Element {
    constructor() { this.children = []; this.listeners = {}; this.style = {}; this.dataset = {}; this.value = ''; this.markup = ''; this.textContent = ''; }
    set innerHTML(value) {
      this.markup = value; this.children = [];
      for (const m of value.matchAll(/\bid="([^"]+)"/g)) ids.set(m[1], new Element());
    }
    get innerHTML() { return this.markup; }
    append(...children) { this.children.push(...children); }
    insertAdjacentHTML(_, value) { this.markup += value; }
    addEventListener(event, fn) { this.listeners[event] = fn; }
    setAttribute() {}
    querySelector() { return new Element(); }
    content() { return this.markup + this.textContent + this.children.map(c => c.content()).join(''); }
  }
  for (const m of html.matchAll(/\bid="([^"]+)"/g)) ids.set(m[1], new Element());
  const segments = ['cur', 'view', 'range', 'scale'].map(k => { const el = new Element(); el.dataset.k = k; return el; });
  const document = { createElement: () => new Element(), getElementById: id => { assert(ids.has(id), `Missing element ${id}`); return ids.get(id); }, querySelectorAll: () => segments };
  const context = vm.createContext({ document, location: { hash }, URLSearchParams, console });
  vm.runInContext(script, context, { timeout: 5000 });
  return {
    run: source => vm.runInContext(source, context, { timeout: 5000 }),
    input: (id, value) => { const el = ids.get(id); el.value = value; el.listeners.input({ target: el }); },
    click: (k, v) => segments.find(s => s.dataset.k === k).listeners.click({ target: { dataset: { v } } }),
    content: id => ids.get(id).content(),
    value: id => ids.get(id).value
  };
}
const f = fixture();
f.input('wcap', '5000');
f.click('cur', 'USD');
assert.equal(+f.value('wcap'), 3429.59);
assert(Math.abs(f.run('capValue()') - 5000 / 1.4579) < 1e-9);
for (let i = 0; i < 20; i++) { f.click('cur', 'AUD'); f.click('cur', 'USD'); }
f.click('cur', 'AUD');
assert.equal(+f.value('wcap'), 5000, 'Currency round trips must preserve the entered cap');
f.click('cur', 'USD'); f.input('wcap', '100'); f.click('cur', 'AUD');
assert.equal(+f.value('wcap'), 145.79, 'Editing a converted cap must set a new value');
f.click('cur', 'USD');
assert.equal(f.run('mixedBudget().base'), 110);
assert.equal(f.run('mixedBudget().planned'), 132);
assert.match(f.content('mixResult'), /32.*over cap/);
f.input('headroom', '50');
assert.equal(f.run('mixedBudget().planned'), 165);
f.input('mix-2', '40');
assert.equal(f.run('mixedBudget().valid'), false);
assert.match(f.content('mixResult'), /90%/);
f.input('mix-2', '50');
assert.equal(f.run('mixedBudget().valid'), true);
f.input('mix-2', '101');
assert.equal(+f.value('mix-2'), 100, 'Clamping must be visible in the input');
f.input('mix-2', '50');
// A hand-computed mixed scenario: 25% Fable ($400), 75% Terra ($55).
f.run('MIX.forEach(m=>m.share=0); MIX[1].share=25; MIX[6].share=75;');
assert.equal(f.run('mixedBudget().base'), 141.25);
let combinations = 0;
for (const zero of [false, true]) for (const cur of ['AUD', 'USD']) for (const view of ['simple', 'detail']) for (const range of ['0', '1', '2']) for (const scale of ['log', 'linear']) {
  f.run(`Object.assign(state,${JSON.stringify({ cur, view, range, scale })}); Object.assign(wl,${JSON.stringify(zero ? { u: 0, c: 0, o: 0 } : { u: 20, c: 200, o: 5 })}); render();`);
  for (const id of ['work', 'fx', 'prices', 'mixResult']) assert.doesNotMatch(f.content(id), /NaN|Infinity|undefined/, `${id}: ${cur}/${view}/${range}/${scale}/${zero}`);
  if (zero) assert.match(f.content('work'), /percentage change not applicable/);
  combinations++;
}
f.run("Object.assign(wl,{u:1e-12,c:0,o:0,capUSD:0});state.scale='linear';renderWork();");
assert.doesNotMatch(f.content('work'), /NaN|Infinity/);
f.run('Object.assign(wl,{u:0,c:0,o:0,capUSD:0});renderWork();');
assert.match(f.content('work'), /A\$0.00|\$0.00/);
const bad = fixture('#cur=bogus&range=1000&scale=invalid&view=no&cap=Infinity');
assert.equal(bad.run('state.cur'), 'AUD');
assert.equal(bad.run('state.range'), '0');
assert.equal(bad.run('capValue()'), 0);
const valid = fixture('#cap=5000&cur=USD');
assert.equal(valid.run('capValue()'), 5000, 'Hash currency must apply before parsing cap');
assert.equal(valid.run("AN.series.find(s=>s.name.startsWith('Claude 2')).steps[0][1]"), 11.02);
assert.match(f.content('prices'), /Historical point sourced/);
assert.match(f.content('prices'), /Provisional history/);
assert.match(f.content('prices'), /model_pricing_july2023\.pdf/);
const template = fs.readFileSync(path.join(__dirname, 'api-price-charts.template.html'), 'utf8');
const fx = JSON.parse(fs.readFileSync(path.join(__dirname, 'api-price-charts.fx.json'), 'utf8'));
const evidence = JSON.parse(fs.readFileSync(path.join(__dirname, 'api-price-charts.sources.json'), 'utf8'));
const json = v => JSON.stringify(v).replace(/</g, '\\u003c');
const rates = Object.entries(fx.rates).sort(([a], [b]) => a.localeCompare(b)).map(([d, r]) => [d, r.AUD]);
assert.equal(html, template.replace('/*FX*/', json(rates)).replace('/*EVIDENCE*/', json(evidence)));
console.log(`PASS: cap conversion and round trips; mixed budget arithmetic and validation; ${combinations} chart combinations; zero/tiny volumes; hash validation; evidence and build parity.`);
