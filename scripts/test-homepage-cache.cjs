const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync('apps/web/public/sw.js', 'utf8');
async function assetCase(path, cachedType, networkType) {
  const listeners = {}; const writes = []; const deletes = []; let fetched = 0;
  const cached = cachedType ? new Response('cached', {headers:{'content-type':cachedType}}) : undefined;
  const context = {
    self: {location:{hostname:'test.invalid'}, addEventListener(name, fn){listeners[name]=fn},skipWaiting(){},clients:{claim(){}}},
    URL, caches: {async match(){return cached},async open(){return {async put(req,res){writes.push(res.headers.get('content-type'))},async delete(){deletes.push(path)}}}},
    async fetch(){fetched++;return new Response('network',{headers:{'content-type':networkType}})},
  };
  vm.runInNewContext(source,context);let response;
  listeners.fetch({request:{method:'GET',url:'https://test.invalid'+path,mode:'cors'},respondWith(p){response=p}});
  const result=await response;await new Promise(resolve=>setImmediate(resolve));
  return {fetched,writes,deletes,body:await result.text()};
}
(async()=>{
  for (const [ext,type] of [['js','text/javascript'],['css','text/css']]) {
    const poisoned=await assetCase('/assets/app.'+ext,'text/html',type);
    assert.equal(poisoned.body,'network');assert.equal(poisoned.deletes.length,1);assert.deepEqual(poisoned.writes,[type]);
    const badNetwork=await assetCase('/assets/app.'+ext,undefined,'text/html');assert.equal(badNetwork.writes.length,0);
    const valid=await assetCase('/assets/app.'+ext,type,type);assert.equal(valid.body,'cached');assert.equal(valid.fetched,0);
  }
  console.log('PASS service worker: reject poisoned HTML asset cache, do not cache SPA fallback as JS/CSS, retain valid asset caching');
})().catch(e=>{console.error(e);process.exitCode=1});
