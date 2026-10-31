import test from 'node:test';
import assert from 'node:assert/strict';
import { gateEnabled, authorizeGate, tagGateAction, bridgeUrl } from '../server/kit-gate.js';
const env={VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'codex/library-gate',KIT_GATE_TEST:'1',KIT_API_KEY:'fake',KIT_TEST_EMAIL:'test@example.com'};
const id='0y425w6qfHCnOnTfd0JC', token='a'.repeat(64);
const reply=data=>({ok:true,status:200,json:async()=>data});
test('gate is impossible in production, other branches or without explicit switch/key/address',()=>{
 assert.equal(gateEnabled(env),true);
 for(const override of [{VERCEL_ENV:'production'},{VERCEL_GIT_COMMIT_REF:'main'},{KIT_GATE_TEST:'0'},{KIT_API_KEY:''},{KIT_TEST_EMAIL:''}]) assert.equal(gateEnabled({...env,...override}),false);
});
test('unknown, calculator and malformed grants never contact a service',async()=>{
 for(const args of [{token:'fake'},{id:'bp-healthcare-costs-estimator'},{action:'opens'},{env:{...env,VERCEL_ENV:'production'}}])
 await assert.rejects(authorizeGate({token,id,action:'downloads',env,...args,request:()=>assert.fail('must not send')}));
});
test('redeems a bound one-use grant before checking exact subscriber identity and state',async()=>{
 const calls=[];
 const subscriberId=await authorizeGate({token,id,action:'downloads',env,request:async(url,options)=>{
 calls.push({url,options});
 return calls.length===1?reply({subscriberId:123,id,action:'downloads'}):reply({subscriber:{id:123,state:'active',email_address:env.KIT_TEST_EMAIL}});
 }});
 assert.equal(subscriberId,'123'); assert.equal(calls[0].url,bridgeUrl);
 assert.equal(calls[0].options.headers['X-Kit-Api-Key'],undefined);
 assert.deepEqual(JSON.parse(calls[0].options.body),{token,id,action:'downloads'});
 assert.equal(calls[1].options.method,'GET');
});
test('inactive, cancelled, mismatched address or id cannot download',async()=>{
 for(const subscriber of [{id:123,state:'inactive',email_address:env.KIT_TEST_EMAIL},{id:123,state:'cancelled',email_address:env.KIT_TEST_EMAIL},{id:123,state:'active',email_address:'someone@example.com'},{id:456,state:'active',email_address:env.KIT_TEST_EMAIL}]){
 let n=0;await assert.rejects(authorizeGate({token,id,action:'downloads',env,request:async()=>++n===1?reply({subscriberId:123,id,action:'downloads'}):reply({subscriber})}));
 }
});
test('wrong-action, wrong-resource, expired or replayed grants cannot reach Kit',async()=>{
 for(const result of [{subscriberId:123,id:'different',action:'downloads'},{subscriberId:123,id,action:'copyOpens'},null]){
 let n=0;await assert.rejects(authorizeGate({token,id,action:'downloads',env,request:async()=>{n++;return result?reply(result):{ok:false};}})); assert.equal(n,1);
 }
});
test('tag writes are additive, test-only and occur only after subscriber revalidation',async()=>{
 const calls=[];
 await tagGateAction({subscriberId:123,id,action:'downloads',env,request:async(url,options)=>{
 calls.push({url,options});if(calls.length===1)return reply({subscriber:{id:123,state:'active',email_address:env.KIT_TEST_EMAIL}});
 if(calls.length===2)return reply({tag:{id:789,name:JSON.parse(options.body).name}});return reply({});
 }});
 assert.equal(calls.length,3); assert.equal(calls[0].options.method,'GET');
 assert.match(JSON.parse(calls[1].options.body).name,/^BPM Library Test: Downloaded: Personal Financial Statement/);
 assert.equal(calls[2].url,'https://api.kit.com/v4/tags/789/subscribers/123');
 assert.deepEqual(JSON.parse(calls[2].options.body),{});
 assert.equal(calls.some(x=>/DELETE|PUT|PATCH/.test(x.options.method)),false);
});
test('an unsubscribed test account receives no writes and is never reactivated',async()=>{
 let n=0;await assert.rejects(tagGateAction({subscriberId:123,id,action:'downloads',env,request:async()=>{n++;return reply({subscriber:{id:123,state:'cancelled',email_address:env.KIT_TEST_EMAIL}});}}));assert.equal(n,1);
});
