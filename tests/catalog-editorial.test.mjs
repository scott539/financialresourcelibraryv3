import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

// Run the actual TS/TSX modules without a browser or any Firebase/GA writes.
registerHooks({
 resolve(spec, context, next) {
  if (spec.startsWith('.') && context.parentURL?.startsWith('file:')) {
   for (const extension of ['.ts', '.tsx']) {
    const url = new URL(spec + extension, context.parentURL);
    if (existsSync(url)) return {url: url.href, shortCircuit: true};
   }
  }
  return next(spec, context);
 },
 load(url, context, next) {
  if (url.startsWith('file:') && /\.(tsx?|json)$/.test(url)) {
   const text = readFileSync(new URL(url), 'utf8');
   const source = url.endsWith('.json') ? 'export default ' + text : ts.transpileModule(text, {
    compilerOptions: {module:ts.ModuleKind.ESNext, target:ts.ScriptTarget.ES2022, jsx:ts.JsxEmit.ReactJSX}, fileName:fileURLToPath(url)
   }).outputText;
   return {format:'module', source, shortCircuit:true};
  }
  return next(url, context);
 }
});
const {correctLegacyCatalogMetadata: correct, STATIC_RESOURCES} = await import('../data/staticResources.ts');
const {resourceFormat} = await import('../data/catalogEditorial.ts');
const {rankCatalog, selectFeaturedResource} = await import('../utils/catalogOrder.ts');
const {currentEdition, currentChecklistId, previousChecklistId, yearEndFeatureUntil} = await import('../utils/catalogEditions.ts');
const {default: ResourceCard} = await import('../components/ResourceCard.tsx');
const {default: ResourceActions} = await import('../components/ResourceActions.tsx');
const patches = JSON.parse(readFileSync(new URL('../data/catalog-editorial.json',import.meta.url)));
const base = {title:'Original',description:'Original',type:'PDF',category:'DIY Personal Finance Toolkit',tags:[],imageUrl:'https://example.com/image.jpg',isComingSoon:false,fileUrl:'https://example.com/file',downloadCount:1234};
const fixture = id => ({...base,id,fileName:patches[id].fileNames[0],...Object.fromEntries(Object.entries(patches[id].fields).map(([field,rule])=>[field,rule.before[0]]))});
const render = element => renderToStaticMarkup(React.createElement(MemoryRouter,null,element));
const actions = resource => render(React.createElement(ResourceActions,{resource,onDownloadClick(){throw Error('render must not download');},onGoogleDriveClick(){throw Error('render must not copy');}}));

test('image refresh preserves catalog data, custom uploads, and all retained originals', async()=>{
 const {applyCatalogImage} = await import('../data/catalogImages.ts');
 const images=JSON.parse(readFileSync(new URL('../data/catalog-images.json',import.meta.url)));
 assert.equal(Object.keys(images).length,16);
 for(const [id,image] of Object.entries(images)) {
  const original={...fixture(id),imageUrl:image.originalUrl};
  const refreshed=correct(original);
  assert.equal(refreshed.imageUrl,image.imageUrl);
  assert.deepEqual({...refreshed,imageUrl:original.imageUrl},{...correct({...original,imageUrl:'custom-upload'}),imageUrl:original.imageUrl});
  assert.equal(applyCatalogImage(refreshed),refreshed);
  const custom={...original,imageUrl:'https://example.com/new-admin-upload.webp'};
  assert.equal(applyCatalogImage(custom),custom);
  const asset=readFileSync(new URL('../public'+image.imageUrl,import.meta.url));
  assert.equal(asset.subarray(8,12).toString(),'WEBP');
  assert.ok(asset.length>1000 && asset.length<200000);
 }
 for(const id of ['0y425w6qfHCnOnTfd0JC','bk9wPWkAao5xzusob9c6','bp-mortgage-payoff-calculator','L26iS881ZhPUIqSWTaRc','QnASLbFPLE48vS6UZqsH',previousChecklistId]) {
  const resource=fixture(id); assert.equal(applyCatalogImage(resource),resource);
 }
});

test('editorial corrections preserve counts, source URLs, future admin edits, and newer uploads',()=>{
 assert.equal(Object.keys(patches).length,22);
 for(const id of Object.keys(patches)) {
  const before=fixture(id), after=correct(before);
  assert.equal(after.downloadCount,1234);
  assert.equal(after.fileUrl,before.fileUrl);
  assert.equal(before.description,patches[id].fields.description.before[0]);
  assert.deepEqual(correct(after),after,'corrections must be idempotent');
  assert.equal(correct({...before,description:'My new custom summary'}).description,'My new custom summary');
  assert.equal(correct({...before,fileName:'New upload.docx'}).description,before.description);
  assert.ok(after.description.length<=110,after.title);
 }
 assert.equal(correct(fixture('bk9wPWkAao5xzusob9c6')).type,'Presentation');
 assert.equal(correct(fixture(currentChecklistId)).type,'Document');
 for(const resource of STATIC_RESOURCES.filter(x=>x.id!=='bp-personal-financial-statement')) assert.equal(resource.type,'Web App');
});

test('one seasonal feature, then PFS and goals; manual feature wins; campaign expires and yields to admin edits',()=>{
 const now=Date.parse('2026-10-31T12:00:00Z');
 const current={...correct(fixture(currentChecklistId)),updatedAt:{toDate:()=>new Date('2026-08-18T23:32:58.887Z')}};
 const pfs=correct(fixture('0y425w6qfHCnOnTfd0JC')), goals=correct(fixture('bk9wPWkAao5xzusob9c6'));
 const popular={...base,id:'popular'}, resources=[popular,goals,current,pfs];
 assert.equal(selectFeaturedResource(resources,now).id,current.id);
 assert.deepEqual(rankCatalog(resources.map(resource=>({resource,score:0})),current.id,{popular:999999}).map(r=>r.id),[current.id,pfs.id,goals.id,popular.id]);
 assert.equal(selectFeaturedResource([...resources,{...base,id:'manual',isFeatured:true}],now).id,'manual');
 assert.equal(selectFeaturedResource(resources,Date.parse(yearEndFeatureUntil)),undefined);
 assert.equal(selectFeaturedResource([{...current,updatedAt:{toDate:()=>new Date('2026-11-01')}}],now),undefined);
 assert.equal(selectFeaturedResource([{...current,isHidden:true}],now),undefined);
});

test('previous checklist retains its identity and history; archive requires an available replacement',()=>{
 const old=correct(fixture(previousChecklistId)), current=correct(fixture(currentChecklistId));
 assert.equal(currentEdition(old,[old,current]),current);
 assert.equal(old.downloadCount,1234);
 assert.equal(old.id,previousChecklistId);
 assert.equal(currentEdition(old,[old]),undefined);
 assert.equal(currentEdition(old,[old,{...current,isHidden:true}]),undefined);
 assert.equal(currentEdition(old,[old,{...current,fileUrl:'',googleDriveUrl:''}]),undefined);
});

test('download and copy actions reflect actual availability and file format',()=>{
 const copyOnly={...correct(fixture('fm5CSMlk66LR3Tgk6xdB')),fileUrl:'',googleDriveUrl:'https://docs.google.com/document/d/example/copy'};
 assert.equal(resourceFormat(copyOnly),'Google Doc');
 assert.match(actions(copyOnly),/>Make a copy</);
 assert.doesNotMatch(actions(copyOnly),/<button|>Download</);
 const goal=correct(fixture('bk9wPWkAao5xzusob9c6'));
 assert.equal(resourceFormat(goal),'PowerPoint · PPTX');
 assert.match(actions(goal),/>Download</);
 assert.match(actions({...base,id:'missing',fileUrl:'',googleDriveUrl:''}),/File currently unavailable/);
 assert.doesNotMatch(actions({...base,id:'soon',isComingSoon:true}),/>Download</);
});

test('cards render the complete summary, without clipping or extra read-more controls; embeds keep titles inert',()=>{
 const resource=correct(fixture('L26iS881ZhPUIqSWTaRc'));
 for(const layout of ['horizontal','vertical']) {
  const html=render(React.createElement(ResourceCard,{resource,layout,onDownloadClick(){},onGoogleDriveClick(){}}));
  assert.ok(html.includes(resource.description));
  assert.doesNotMatch(html,/Read more|line-clamp/);
 }
 const html=render(React.createElement(ResourceCard,{resource,embed:true,onDownloadClick(){},onGoogleDriveClick(){}}));
 assert.doesNotMatch(html,/href="\/preview\//);
});
