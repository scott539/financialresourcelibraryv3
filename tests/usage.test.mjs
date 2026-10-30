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
  '@google-cloud/firestore': 'export class Firestore {constructor(options){globalThis.testDbOptions=options;return globalThis.testFirestore;}}; export const FieldValue={increment:by=>({by})};',
  'google-auth-library':'export class IdentityPoolClient {constructor(options){this.options=options;}}; export class GoogleAuth {constructor(options){this.options=options;}};'
};
registerHooks({resolve(spec,ctx,next) {
  return mocks[spec] ? {url:'data:text/javascript,'+encodeURIComponent(mocks[spec]),shortCircuit:true} : next(spec,ctx);
}});
Object.assign(process.env, { BPM_GCP_WIF_PROVIDER:'projects/272224588349/locations/global/workloadIdentityPools/bpm-vercel/providers/vercel', BPM_METRICS_DATABASE:'bpm-resource-metrics',
  BPM_GA_TIMEZONE:'America/Denver', BPM_DOWNLOAD_START:'2026-10-30', VERCEL_ENV:'production' });
const { default: usage } = await import('../api/usage.js');
const { default: download } = await import('../api/download.js');
const { default: copy } = await import('../api/copy.js');
const { ledger, settings, catalogTotals } = await import('../server/ledger.js');
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

test('one mixed catalog ranks the Featured slot, pins and then the larger verified metric', async () => {
  const { rankCatalog, selectFeaturedResource } = await import('../utils/catalogOrder.ts');
  const goal = 'bk9wPWkAao5xzusob9c6', file = 'cVIAlLn6rU7pIay6ge4C', budget = 'bp-budget-template-tracker';
  const entries = [file, goal, healthcare, pfs, budget].map(id => ({
    resource: { id, title: policy.resources[id].title }, score: 0
  }));
  const { counts, rankCounts } = catalogTotals({
    counts: { [file]: 2, [healthcare]: 10 }, downloads: { [file]: 9600, [healthcare]: 120 },
    views: { [file]: 100, [healthcare]: 4 }
  });
  assert.equal(counts[file], 9605);
  assert.equal(rankCounts[file], 9605);
  assert.equal(rankCounts[healthcare], 9494);
  const rank = (items, featured) => rankCatalog([...items], featured, rankCounts).map(r => r.id);
  assert.deepEqual(rank(entries), [pfs, goal, file, healthcare, budget]);
  assert.deepEqual(rank(entries, budget), [budget, pfs, goal, file, healthcare]);
  assert.deepEqual(rank(entries, goal), [goal, pfs, file, healthcare, budget]);
  assert.deepEqual(rank(entries.filter(m => m.resource.id === healthcare)), [healthcare]);
  assert.deepEqual(rank(entries.filter(m => m.resource.id !== pfs), budget), [budget, goal, file, healthcare]);
  const baseline = catalogTotals().rankCounts;
  assert.deepEqual(rankCatalog([...entries], undefined, baseline).map(r => r.id), [pfs, goal, healthcare, budget, file]);
  const now = Date.parse('2026-10-30T12:00:00Z');
  const flagged = [
    { id: goal, isFeatured: true, featuredUntil: '2026-11-01' },
    { id: budget, isFeatured: true, featuredUntil: '2026-11-02' },
    { id: healthcare, isFeatured: true, featuredUntil: '2026-10-29' },
    { id: file, isFeatured: true, isHidden: true }
  ];
  assert.equal(selectFeaturedResource(flagged, now)?.id, budget);
  assert.equal(selectFeaturedResource(flagged, Date.parse('2026-11-02')), undefined);
});


test('federated identity is request-scoped, cannot use a JSON key, and keeps previews offline', async () => {
  const { withVercelIdentity, googleClient } = await import('../server/google-identity.js');
  const config = settings();
  const options = googleClient(config.provider, 'https://www.googleapis.com/auth/analytics.readonly').options;
  assert.equal(options.audience, '//iam.googleapis.com/' + config.provider);
  assert.match(options.service_account_impersonation_url, /bpm-library-metrics@bp-money-resources\.iam\.gserviceaccount\.com:generateAccessToken$/);
  assert.deepEqual(options.scopes, ['https://www.googleapis.com/auth/analytics.readonly']);
  const supplier = options.subject_token_supplier;
  const getToken = withVercelIdentity(async () => { await new Promise(setImmediate); return supplier.getSubjectToken(); });
  const token = value => getToken({headers:{'x-vercel-oidc-token':value}});
  assert.deepEqual(await Promise.all([token('request-a'),token('request-b')]), ['request-a','request-b']);
  await assert.rejects(getToken({headers:{authorization:'Bearer unrelated'}}), /identity unavailable/);
  assert.equal(globalThis.testDbOptions.databaseId, 'bpm-resource-metrics');
  assert.deepEqual(globalThis.testDbOptions.auth.options.authClient.options.scopes, ['https://www.googleapis.com/auth/datastore']);
  try {
    process.env.VERCEL_ENV='preview';
    assert.equal(settings(), null);
    const baseline = await send(usage,{method:'GET',headers:{}});
    assert.equal(baseline.body.live, false);
    assert.equal(baseline.body.counts[healthcare],9480);
  } finally { process.env.VERCEL_ENV='production'; }
});
