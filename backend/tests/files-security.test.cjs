const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const fsp=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
async function fixture(t){
 const root=await fsp.mkdtemp(path.join(os.tmpdir(),'mh-hyr-security-'));
 t.after(()=>fsp.rm(root,{recursive:true,force:true}));
 await fsp.mkdir(path.join(root,'exports/payroll'),{recursive:true});
 await fsp.mkdir(path.join(root,'routes'));
 await fsp.writeFile(path.join(root,'exports/payroll/sample.pdf'),'synthetic safe PDF fixture');
 await fsp.writeFile(path.join(root,'outside.pdf'),'synthetic private fixture');
 await fsp.symlink(path.join(root,'outside.pdf'),path.join(root,'exports/payroll/link.pdf'));
 const routes={};const router={get:(p,h)=>routes['GET '+p]=h,delete:(p,h)=>routes['DELETE '+p]=h,post:()=>{}};
 const code=fs.readFileSync(path.join(__dirname,'../routes/files.js'),'utf8');
 vm.runInNewContext(code,{require:n=>n==='express'?{Router:()=>router}:n==='../database/connection'?{db:{}}:require(n),__dirname:path.join(root,'routes'),module:{exports:{}},Buffer,console:{log(){},error(){}}});
 async function invoke(method,filename){
  const result={status:200};const res={status(n){result.status=n;return this;},json(o){result.body=o;return this;},send(o){result.body=o;return this;},setHeader(){}};
  await routes[method+(method==='GET'?' /download/:type/:filename':' /:type/:filename')]({params:{type:'payroll',filename}},res);
  return result;
 }
 return {invoke,root};
}
test('decoded separators and traversal are rejected for read and delete',async t=>{
 const {invoke,root}=await fixture(t);
 for(const method of ['GET','DELETE'])for(const name of ['../outside.pdf','..\\outside.pdf','..','.','bad\0.pdf'])assert.equal((await invoke(method,name)).status,400);
 assert.equal(await fsp.readFile(path.join(root,'outside.pdf'),'utf8'),'synthetic private fixture');
});
test('symlinks pointing outside the export directory are rejected',async t=>{
 const {invoke,root}=await fixture(t);
 for(const method of ['GET','DELETE'])assert.equal((await invoke(method,'link.pdf')).status,403);
 assert.equal(await fsp.readFile(path.join(root,'outside.pdf'),'utf8'),'synthetic private fixture');
});
test('ordinary export download remains valid',async t=>{
 const {invoke}=await fixture(t);const r=await invoke('GET','sample.pdf');assert.equal(r.status,200);assert.equal(r.body.toString(),'synthetic safe PDF fixture');
});
test('ordinary export deletion only removes its fixture',async t=>{
 const {invoke,root}=await fixture(t);assert.equal((await invoke('DELETE','sample.pdf')).status,200);await assert.rejects(fsp.access(path.join(root,'exports/payroll/sample.pdf')));await fsp.access(path.join(root,'outside.pdf'));
});
