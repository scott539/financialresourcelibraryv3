// Run with Node 22.15+ or 24. These isolated adapters never reach GA or Firebase.
import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const docs = new Map();
function snapshot(path) {
  const value = docs.get(path);
  return { exists: value !== undefined, data: () => structuredClone(value) };
}
function merge(previous, change) {
  if (change?.by !== undefined) return (previous || 0) + change.by;
  if (!change || typeof change !== 'object' || change instanceof Date) return change;
  return Object.fromEntries([...new Set([...Object.keys(previous || {}),...Object.keys(change)])]
    .map(k => [k, k in change ? merge(previous?.[k],change[k]) : previous[k]]));
}
function ref(path) {
  return { path, get: async () => snapshot(path), collection: name => collection(path + '/' + name) };
}
function collection(path) { return { doc: id => ref(path + '/' + id) }; }
globalThis.testFirestore = {
  collection, async runTransaction(fn) {
    await fn({
      get: r => r.get(), getAll: (...refs) => Promise.all(refs.map(r => r.get())),
      create(r, value) { assert.equal(docs.has(r.path),false); docs.set(r.path,value); },
      set(r, value, opts) {
        if (opts.mergeFields) docs.set(r.path, { ...(docs.get(r.path) || {}), ...value });
        else docs.set(r.path, merge(docs.get(r.path),value));
      }
    });
  }
};
const mocks = {
  'firebase-admin/app': 'export const cert=x=>x, getApps=()=>[], initializeApp=()=>({});',
  'firebase-admin/firestore':'export const getFirestore=()=>globalThis.testFirestore, FieldValue={increment:by=>({by})};'
};
registerHooks({resolve(spec,ctx,next) {
  return mocks[spec] ? {url:'data:text/javascript,'+encodeURIComponent(mocks[spec]),shortCircuit:true} : next(spec,ctx);
}});
Object.assign(process.env, { BPM_METRICS_GOOGLE_JSON:'{}', BPM_METRICS_DATABASE:'usage-test',
  BPM_GA_TIMEZONE:'America/Denver', BPM_DOWNLOAD_START:'2026-10-30', VERCEL_ENV:'preview' });
const { default: usage } = await import('../api/usage.js');
const { default: download } = await import('../api/download.js');
const { default: copy } = await import('../api/copy.js');
const { ledger,settings } = await import('../server/ledger.js');
const { toolForPath, gaDay, policy } = await import('../server/policy.js');
const healthcare = 'bp-healthcare-costs-estimator', pfs = '0y425w6qfHCnOnTfd0JC';
const src = readFileSync(new URL('../public/tool-pageview.js',import.meta.url),'utf8');
const origin = 'https://biggerpocketsmoney.com';
const receipt = () => crypto.randomUUID();
function response() {
  return {code:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(c){this.code=c;return this;},
    json(v){this.body=v;return this;},end(){return this;},send(v){this.body=v;return this;},
    redirect(c,url){this.code=c;this.location=url;return this;}};
}
async function send(handler, req) { const res=response(); await handler(req,res);return res; }
async function read() { return (await send(usage,{method:'GET',headers:{}})).body.counts; }
function fixtureFetch(html=false) {
  return async url => String(url).includes('firestore.googleapis.com') ? Response.json({fields:{
    fileName:{stringValue:'Statement.xlsx'},fileUrl:{stringValue:'https://firebasestorage.googleapis.com/v0/b/bp-money-resources.firebasestorage.app/o/test.xlsx'}
  }}) : new Response(html ? '<html>missing</html>' : Buffer.from('504b030414000600', 'hex'),
    {headers:{'Content-Type':html?'text/html':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}});
}
test('direct tool visit, repeat delivery and reload; PFS page and actual file request',async(t) => {
  t.mock.timers.enable({apis:['Date'],now:new Date('2026-10-30T17:00:00Z')});
  const before=await read();
  assert.equal(before[healthcare],9480);
  const queue = [];
  function visit(path, consent='granted') {
    const window = {crypto}; window.top=window;
    runInNewContext(src, {window,crypto,location:new URL(origin+path),URL,document:{
      currentScript:{src:'https://financialresourcelibraryv3.vercel.app/tool-pageview.js'},
      body:{classList:{contains:c=>c==='page'}},documentElement:{dataset:{bpmAnalyticsConsent:consent}}
    },fetch:async(url,opts)=>{
      const body=JSON.parse(opts.body);queue.push(body);
      const result=await send(usage,{method:'POST',headers:{origin},body});
      return {ok:result.code===204,status:result.code};
    }});
  }
  visit('/healthcarecosts/'); await new Promise(setImmediate);
  assert.equal((await read())[healthcare],9481);
  await send(usage,{method:'POST',headers:{origin},body:queue[0]});
  assert.equal((await read())[healthcare],9481);
  visit('/HealthcareCosts/'); await new Promise(setImmediate);
  assert.equal((await read())[healthcare],9482);
  visit('/healthcarecosts/','denied'); await new Promise(setImmediate);
  assert.equal((await read())[healthcare],9482);
  const page = await send(usage,{method:'POST',headers:{origin},body:{path:'/resources-pfs/',eventId:receipt()}});
  assert.equal(page.code,400); assert.equal((await read())[pfs],0);
  const actualFetch=globalThis.fetch;
  const file = {method:'GET',query:{id:pfs,receipt:receipt(),measure:'1'}};
  try {
    globalThis.fetch=fixtureFetch();
    const result = await send(download,file);
    assert.equal(result.code,200); assert.match(result.headers['Content-Disposition'],/attachment/);
    assert.equal((await read())[pfs],1);
    await send(download,file); assert.equal((await read())[pfs],1);
    await send(copy,{method:'POST',headers:{origin:'https://example.test',host:'example.test'},body:{id:pfs,eventId:receipt()}});
    assert.equal((await read())[pfs],1);
    await send(download,{...file,query:{...file.query,measure:'0',receipt:receipt()}}); assert.equal((await read())[pfs],1);
    globalThis.fetch=fixtureFetch(true);
    assert.equal((await send(download,{...file,query:{...file.query,receipt:receipt()}})).code,302);
    assert.equal((await read())[pfs],1);
  } finally { globalThis.fetch=actualFetch; }
  const store = ledger(settings()), day=gaDay(new Date(),'America/Denver');
  await store.settle(day,{[healthcare]:5}); await store.settle(day,{[healthcare]:5});
  assert.equal((await read())[healthcare],9485); assert.equal((await read())[pfs],1);
  await store.record(healthcare,receipt(),'views'); assert.equal((await read())[healthcare],9485);
  await store.settle(day,{[healthcare]:0}); assert.equal((await read())[healthcare],9480);
});
test('catalog scope, historical aliases and eligibility',() => {
  assert.equal(Object.keys(policy.resources).length,23);
  assert.equal(policy.resources['bp-personal-financial-statement'].aliasOf,pfs);
  assert.equal(toolForPath('/healthcare-cost-estimator'),healthcare);
  for(const path of ['/resources/','/pfs/','/resources-pfs/','/retirement-optimizer/','/retirement-simulator/','/wp-content/uploads/bpm-healthcare-estimator.html'])
    assert.equal(toolForPath(path),undefined);
});
