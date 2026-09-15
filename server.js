// StockFlow shared server — no Firebase required.
// Run: node server.js
// For deployment set STOCKFLOW_SECRET to a long random value and optionally STOCKFLOW_DATA_FILE.
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const Core=require('./core.js');

const root=__dirname;
const port=Number(process.env.PORT||4173);
const host=process.env.HOST||'0.0.0.0';
const DATA_FILE=path.resolve(process.env.STOCKFLOW_DATA_FILE||path.join(root,'.stockflow-data.json'));
const SECRET_FILE=path.join(root,'.stockflow-secret');
const MAX_BODY=2*1024*1024;

function loadSecret(){
  if(process.env.STOCKFLOW_SECRET)return process.env.STOCKFLOW_SECRET;
  try{return fs.readFileSync(SECRET_FILE,'utf8').trim();}catch{}
  const secret=crypto.randomBytes(48).toString('base64url');
  fs.writeFileSync(SECRET_FILE,secret+'\n',{mode:0o600});
  return secret;
}
const SECRET=loadSecret();
function blankState(){return {format:1,cashiers:{},data:Core.blank()};}
function loadState(){try{const raw=JSON.parse(fs.readFileSync(DATA_FILE,'utf8'));return {format:1,cashiers:raw.cashiers||{},data:Core.normalize(raw.data)};}catch(e){if(e.code==='ENOENT')return blankState();throw new Error('StockFlow data file is unreadable: '+e.message);}}
let state=loadState();
function saveState(next){const dir=path.dirname(DATA_FILE);fs.mkdirSync(dir,{recursive:true});const tmp=DATA_FILE+'.tmp-'+process.pid+'-'+Date.now();fs.writeFileSync(tmp,JSON.stringify(next,null,2)+'\n',{mode:0o600});fs.renameSync(tmp,DATA_FILE);state=next;}
let writeQueue=Promise.resolve();
function locked(fn){const run=writeQueue.then(fn,fn);writeQueue=run.catch(()=>{});return run;}
function json(res,status,payload){const body=JSON.stringify(payload);res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Content-Length':Buffer.byteLength(body),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(body);}
function readJson(req){return new Promise((resolve,reject)=>{let size=0,chunks=[];req.on('data',c=>{size+=c.length;if(size>MAX_BODY){reject(Object.assign(new Error('Request is too large.'),{status:413}));req.destroy();return;}chunks.push(c);});req.on('end',()=>{try{resolve(chunks.length?JSON.parse(Buffer.concat(chunks).toString('utf8')):{});}catch{reject(Object.assign(new Error('Invalid JSON request.'),{status:400}));}});req.on('error',reject);});}
function normalizeId(v){return String(v||'').trim();}
function validateAccount(id,name,password,signup=false){id=normalizeId(id);if(!/^[A-Za-z0-9_-]{3,20}$/.test(id))throw Object.assign(new Error('Cashier ID must be 3–20 letters, numbers, _ or -.'),{status:400});password=String(password||'');if(password.length<6||password.length>72)throw Object.assign(new Error('Password must be 6–72 characters.'),{status:400});if(signup){name=String(name||'').trim();if(!name||name.length>60)throw Object.assign(new Error('Enter a cashier name up to 60 characters.'),{status:400});}return {id,key:id.toLowerCase(),name,password};}
function hashPassword(password,salt){return crypto.scryptSync(password,salt,64).toString('hex');}
function safeCashier(a){return {id:a.id,name:a.name,key:a.key,createdAt:a.createdAt};}
function signToken(account){const payload=Buffer.from(JSON.stringify({k:account.key,exp:Date.now()+1000*60*60*24*180})).toString('base64url');const sig=crypto.createHmac('sha256',SECRET).update(payload).digest('base64url');return payload+'.'+sig;}
function verifyToken(token){if(!token||!token.includes('.'))return null;const [payload,sig]=token.split('.');const expected=crypto.createHmac('sha256',SECRET).update(payload).digest('base64url');const a=Buffer.from(sig),b=Buffer.from(expected);if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return null;let p;try{p=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));}catch{return null;}if(!p.k||Number(p.exp)<Date.now())return null;const account=state.cashiers[p.k];return account?.active===false?null:account||null;}
function bearer(req){const h=String(req.headers.authorization||'');return h.startsWith('Bearer ')?h.slice(7):'';}
function requireAccount(req){const account=verifyToken(bearer(req));if(!account)throw Object.assign(new Error('Your session expired. Please sign in again.'),{status:401});return account;}
function actor(account){return {uid:'cashier:'+account.key,email:account.name+' · '+account.id,name:account.name,id:account.id};}

async function api(req,res,url){
  if(req.method==='POST'&&url.pathname==='/api/signup'){
    const body=await readJson(req),v=validateAccount(body.id,body.name,body.password,true);
    const result=await locked(()=>{state=loadState();if(state.cashiers[v.key])throw Object.assign(new Error('That Cashier ID is already taken. Try another one.'),{status:409});const salt=crypto.randomBytes(16).toString('hex');const account={id:v.id,key:v.key,name:v.name,salt,passwordHash:hashPassword(v.password,salt),createdAt:Date.now(),active:true};const next={...state,cashiers:{...state.cashiers,[v.key]:account}};saveState(next);return account;});
    return json(res,201,{token:signToken(result),cashier:safeCashier(result)});
  }
  if(req.method==='POST'&&url.pathname==='/api/login'){
    const body=await readJson(req),v=validateAccount(body.id,'',body.password,false);state=loadState();const account=state.cashiers[v.key];if(!account||account.active===false){return json(res,401,{error:'Cashier ID or password is incorrect.'});}const actual=Buffer.from(hashPassword(v.password,account.salt),'hex'),expected=Buffer.from(account.passwordHash,'hex');if(actual.length!==expected.length||!crypto.timingSafeEqual(actual,expected))return json(res,401,{error:'Cashier ID or password is incorrect.'});return json(res,200,{token:signToken(account),cashier:safeCashier(account)});
  }
  if(url.pathname.startsWith('/api/')){
    state=loadState();const account=requireAccount(req);
    if(req.method==='GET'&&url.pathname==='/api/me')return json(res,200,{cashier:safeCashier(account)});
    if(req.method==='GET'&&url.pathname==='/api/data')return json(res,200,{data:state.data});
    if(req.method==='POST'&&url.pathname==='/api/mutate'){
      const body=await readJson(req);if(!body.command||typeof body.command!=='object')throw Object.assign(new Error('Missing StockFlow command.'),{status:400});
      const data=await locked(()=>{state=loadState();const latest=state.cashiers[account.key];if(!latest||latest.active===false)throw Object.assign(new Error('Your cashier account is no longer active.'),{status:401});const nextData=Core.apply(state.data,body.command,actor(latest));saveState({...state,data:nextData});return nextData;});
      return json(res,200,{data});
    }
    return json(res,404,{error:'API endpoint not found.'});
  }
  return false;
}

const publicFiles=new Set(['/index.html','/styles.css','/app.js','/core.js','/catalog.js','/stockflow-api.js']);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png'};
function serveStatic(req,res,url){let requestPath=url.pathname==='/'?'/index.html':url.pathname;if(!publicFiles.has(requestPath)&&!requestPath.startsWith('/assets/')){res.writeHead(404).end('Not found');return;}let file;try{file=path.resolve(root,'.'+decodeURIComponent(requestPath));}catch{res.writeHead(400).end('Bad request');return;}if(!file.startsWith(root+path.sep)){res.writeHead(403).end('Forbidden');return;}fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end('Not found');return;}res.writeHead(200,{'Content-Type':mime[path.extname(file).toLowerCase()]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'});res.end(data);});}

function createServer(){return http.createServer(async(req,res)=>{let url;try{url=new URL(req.url,'http://localhost');}catch{res.writeHead(400).end('Bad request');return;}try{const handled=await api(req,res,url);if(handled!==false)return;serveStatic(req,res,url);}catch(e){if(!res.headersSent)json(res,e.status||500,{error:e.status?e.message:'Server error. '+e.message});}});}
if(require.main===module)createServer().listen(port,host,()=>console.log(`StockFlow shared server: http://${host}:${port}`));
module.exports={createServer,blankState,hashPassword,signToken,verifyToken};
