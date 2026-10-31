import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { measureIframeContent } from '../utils/iframeSizing.ts';

const html=readFileSync(new URL('../wordpress/resource-library-embed.html',import.meta.url),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
function host({type='navigate',hash='',y=0}={}) {
 const events={},frames=[],calls=[],classes=new Set();let height=800;
 const win={scrollX:0,scrollY:y,addEventListener(name,fn){events[name]=fn;},removeEventListener(name,fn){if(events[name]===fn)delete events[name];},
  scrollTo(p){calls.push(p);this.scrollY=p.top;}};
 const iframe={src:'https://financialresourcelibraryv3.vercel.app/#/',contentWindow:{},getBoundingClientRect:()=>({height}),style:{}};
 // Simulate the browser anchoring the paragraph below the expanding iframe.
 Object.defineProperty(iframe.style,'height',{set(value){const next=parseInt(value);win.scrollY+=next-height;height=next;}});
 runInNewContext(script,{window:win,location:{hash},performance:{getEntriesByType:()=>[{type}]},URL,
  document:{getElementById:()=>iframe,documentElement:{classList:{add:x=>classes.add(x),remove:x=>classes.delete(x)}}},
  requestAnimationFrame:fn=>frames.push(fn),setTimeout:()=>1,clearTimeout(){}});
 return {win,iframe,calls,classes,events,flush(){while(frames.length)frames.shift()();},
  resize(height,extra={}){events.message({origin:new URL(iframe.src).origin,source:iframe.contentWindow,data:{type:'financial-library-resize',height,ready:true},...extra});},height:()=>height};
}
test('content measurement grows and shrinks independently of the iframe viewport',()=>{
 let height=9200;const root={get scrollHeight(){return height;},get offsetHeight(){return height;},getBoundingClientRect:()=>({height})};
 assert.equal(measureIframeContent(root),9202);
 height=650;assert.equal(measureIframeContent(root),652);
 // Repeated measurements do not add another buffer to the host viewport.
 for(let i=0;i<10;i++)assert.equal(measureIframeContent(root),652);
 assert.equal(measureIframeContent(null),0);
});
test('fresh mobile-length catalog expansion stays at the top and the guard ends after readiness',()=>{
 const h=host();h.resize(9200);h.flush();
 assert.equal(h.win.scrollY,0);assert.equal(h.height(),9200);assert.equal(h.classes.size,0);
 assert.equal(h.calls.length,2);
 h.win.scrollY=1500;h.resize(9400);h.flush();assert.equal(h.calls.length,2);
 h.resize(650);assert.equal(h.height(),650);
});
test('user interaction cancels pending scroll correction',()=>{
 for(const event of ['touchstart','wheel','pointerdown','keydown']) {
  const h=host();h.events[event]();h.resize(9200);h.flush();assert.equal(h.calls.length,0);
 }
 const h=host();h.resize(9200);h.events.touchstart();h.win.scrollY=500;h.flush();assert.equal(h.win.scrollY,500);
});
test('back, reload, deep links, and already-scrolled visits retain browser scroll behavior',()=>{
 for(const options of [{type:'back_forward'},{type:'reload'},{hash:'#details'},{y:300}]) {
  const h=host(options);h.resize(9200);h.flush();assert.equal(h.calls.length,0);
 }
});
test('only valid ready messages from this iframe resize it; legacy feedback cannot loop',()=>{
 const h=host();
 h.resize(9200,{origin:'https://example.com'});h.resize(9200,{source:{}});
 for(const height of [NaN,Infinity,-1,0,100001])h.resize(height);
 h.resize(9200,{data:{type:'financial-library-resize',height:9200,ready:false}});
 assert.equal(h.height(),800);assert.equal(h.calls.length,0);
 h.resize(802,{data:{type:'financial-library-resize',height:802}});assert.equal(h.height(),800);
 assert.match(html,/loading="eager"/);
});
