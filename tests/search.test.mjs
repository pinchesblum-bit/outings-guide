import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';
const app = {innerHTML:''};
const input = {value:'',addEventListener(){}};
const form = {querySelector:()=>input,addEventListener(){},isConnected:true};
const context = vm.createContext({window:{addEventListener(){}}, document:{getElementById:id=>id==='app'?app:id==='filterSearchForm'?form:null,querySelectorAll:()=>[],querySelector:()=>null}, location:{hash:'#/search'}, URL, URLSearchParams, setTimeout, clearTimeout, console});
vm.runInContext(fs.readFileSync(new URL('../data.js', import.meta.url),'utf8'), context);
vm.runInContext(fs.readFileSync(new URL('../app.js', import.meta.url),'utf8').replace(/router\(\);\s*$/,''), context);
const run = code => vm.runInContext(code,context);
const names = query => run(`applyFilters(DATA.listings, new URLSearchParams({q:${JSON.stringify(query)}})).map(x=>x.name)`);
test('activity search finds parks whose names omit park',()=>{
 const results=names('indoor park');
 for(const name of ['Billy Beez','SkyZone','Bounce U','Kids Empire','Space Club','Thrillz']) assert.ok(results.includes(name),name);
 for(const name of ['American Girl Place','Montvale Lanes','Central Park']) assert.ok(!results.includes(name),name);
 assert.ok(names('trampoline park').includes('SkyZone'));
 assert.ok(names('indoor playgrounds').includes('Billy Beez'));
 console.log(`${results.length} indoor park matches`);
});
test('specific searches stay relevant',()=>{
 const results=names('zoo');
 assert.ok(results.includes('Zoo America'));
 assert.ok(!results.some(name=>/aquarium/i.test(name)&&!/zoo/i.test(name)));
 assert.ok(run(`searchRelevance({name:'Coffee Shop',setting:'indoor',details:['12 Park Road, NY 10001']},'indoor park')`)===0);
});
test('pages are bounded, disjoint, and have 18 results',()=>{
 run(`var results = Array.from({length:40},(_,id)=>({id}));`);
 assert.equal(run('searchPage(results,1).visible.length'),18);
 assert.equal(run('searchPage(results,2).visible[0].id'),18);
 assert.equal(run('searchPage(results,3).visible.length'),4);
 for(const value of ['-1','bad','Infinity','0']) assert.equal(run(`searchPage(results,${JSON.stringify(value)}).page`),1);
 assert.equal(run('searchPage(results,999).page'),3);
});
test('search renders numbered pages and preserves the query',()=>{
 context.location.hash='#/search?q=indoor+park&page=2';run('renderSimpleSearch()');
 assert.match(app.innerHTML,/Page 2 of/);assert.match(app.innerHTML,/aria-current="page"/);
 assert.match(app.innerHTML, /q=indoor\+park&amp;page=1/);
 assert.doesNotMatch(app.innerHTML,/Show more|filter-toggle/);
 context.location.hash='#/search';run('renderSimpleSearch()');assert.doesNotMatch(app.innerHTML,/search-pagination/);
 context.location.hash='#/search?q=zzzzzzzz';run('renderSimpleSearch()');assert.match(app.innerHTML,/No places found/);assert.doesNotMatch(app.innerHTML,/search-pagination/);
});
