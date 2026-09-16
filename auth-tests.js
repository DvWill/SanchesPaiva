const assert=require('node:assert/strict');
const Module=require('node:module');
const bcrypt=require('bcryptjs');

const admins=[];
const sessions=[];
let adminInserts=0;
class FakePool{
  async query(sql,params=[]){
    if(sql.startsWith('select 1 from admins'))return {rows:admins.filter(admin=>admin.email.toLowerCase()===params[0].toLowerCase()).map(()=>({one:1}))};
    if(sql.startsWith('insert into admins')){
      if(!admins.some(admin=>admin.email===params[0])){admins.push({id:'test-admin',email:params[0],password_hash:params[1]});adminInserts++}
      return {rows:[]};
    }
    if(sql.startsWith('select * from admins'))return {rows:admins.filter(admin=>admin.email.toLowerCase()===params[0].toLowerCase())};
    if(sql.startsWith('insert into admin_sessions')){sessions.push({admin_id:params[0],token_hash:params[1]});return {rows:[]}}
    if(sql.startsWith('select a.id,a.email from admin_sessions'))return {rows:sessions.some(session=>session.token_hash===params[0])?admins.map(({id,email})=>({id,email})):[]};
    throw new Error(`Unexpected query: ${sql}`);
  }
}

const originalLoad=Module._load;
Module._load=function(request,parent,isMain){
  if(request==='pg')return {Pool:FakePool};
  return originalLoad.call(this,request,parent,isMain);
};
process.env.ADMIN_EMAIL='admin@example.test';
process.env.ADMIN_PASSWORD='test-password-only';
const app=require('./server');
Module._load=originalLoad;

async function main(){
  const server=app.listen(0,'127.0.0.1');
  try{
    await new Promise(resolve=>server.once('listening',resolve));
    const base=`http://127.0.0.1:${server.address().port}`;
    const login=(email,password)=>fetch(`${base}/api/auth/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
    let response=await login('admin@example.test','wrong-password');
    assert.equal(response.status,401);
    assert.equal(adminInserts,1,'serverless login should create the configured administrator');

    response=await login('admin@example.test','test-password-only');
    assert.equal(response.status,200);
    const cookie=response.headers.get('set-cookie')?.split(';')[0];
    assert.ok(cookie?.startsWith('admin_session='));
    response=await fetch(`${base}/api/auth/session`,{headers:{Cookie:cookie}});
    assert.equal(response.status,200);
    assert.equal((await response.json()).email,'admin@example.test');

    response=await login('admin@example.test','test-password-only');
    assert.equal(response.status,200);
    assert.equal(adminInserts,1,'subsequent logins should keep the existing administrator');
    console.log('Admin login bootstrap test passed.');
  }finally{
    await new Promise(resolve=>server.close(resolve));
  }
}
main().catch(error=>{console.error(error);process.exitCode=1});
