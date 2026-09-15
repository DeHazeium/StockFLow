(function(root){
  'use strict';
  // Adapted from the supplied game's Identity Toolkit + Realtime Database REST backbone.
  const CFG=root.MB_FIREBASE_CONFIG||{},KEY='stockflow_auth_v1',LOCAL='stockflow_demo_v1';
  const Core=root.StockFlowCore;let session=null,refreshing=null;
  function saveSession(s){session=s;if(s)sessionStorage.setItem(KEY,JSON.stringify(s));else sessionStorage.removeItem(KEY);}
  try{session=JSON.parse(sessionStorage.getItem(KEY)||'null');}catch{}
  async function request(url,options={}){try{return await fetch(url,{...options,signal:AbortSignal.timeout(20000)});}catch(e){const err=new Error('Connection interrupted. Check your connection, then retry. If a save was in progress, use Retry pending save to confirm it safely.');err.ambiguous=true;throw err;}}
  async function error(response){const d=await response.json().catch(()=>({}));const msg=d.error?.message||d.error||'Request failed';
    if(response.status===401||response.status===403||/permission_denied|Permission denied/i.test(msg))return new Error('Your account cannot access the sales database yet. See Setup for the database rules and team access.');
    if(/INVALID_LOGIN_CREDENTIALS|INVALID_PASSWORD|EMAIL_NOT_FOUND/.test(msg))return new Error('Email or password is incorrect.');
    if(/TOO_MANY_ATTEMPTS/.test(msg))return new Error('Too many attempts. Please wait before trying again.');
    return new Error(String(msg));
  }
  async function signIn(email,password){
    const res=await request('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key='+encodeURIComponent(CFG.apiKey),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,returnSecureToken:true})});
    if(!res.ok)throw await error(res);const d=await res.json();saveSession({uid:d.localId,email:d.email,idToken:d.idToken,refreshToken:d.refreshToken,expiresAt:Date.now()+Number(d.expiresIn)*1000});return session;
  }
  async function token(){
    if(!session)throw new Error('Please sign in again.');
    if(Date.now()<session.expiresAt-60000)return session.idToken;
    if(!refreshing)refreshing=(async()=>{
      const res=await request('https://securetoken.googleapis.com/v1/token?key='+encodeURIComponent(CFG.apiKey),{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'refresh_token',refresh_token:session.refreshToken})});
      if(!res.ok){if(res.status===400||res.status===401)saveSession(null);throw new Error('Session expired. Sign out and sign in again.');}
      const d=await res.json();saveSession({...session,idToken:d.id_token,refreshToken:d.refresh_token,expiresAt:Date.now()+Number(d.expires_in)*1000});return session.idToken;
    })().finally(()=>{refreshing=null;});return refreshing;
  }
  async function remote(method,body,etag){const t=await token();return request(CFG.databaseURL.replace(/\/$/,'')+'/stockFlow/data.json?auth='+encodeURIComponent(t),{method,cache:'no-store',headers:{'Content-Type':'application/json',...(method==='GET'?{'X-Firebase-ETag':'true'}:{}),...(etag?{'if-match':etag}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});}
  function localRead(){const raw=localStorage.getItem(LOCAL);if(!raw)return Core.blank();try{return Core.normalize(JSON.parse(raw));}catch{throw new Error('The demo data could not be read. Export or recover your browser data before resetting it.');}}
  function createStore(demo){return {
    demo,
    actor:()=>demo?{uid:'demo-seller',email:'Demo seller'}:{uid:session?.uid,email:session?.email},
    async read(){if(demo)return localRead();const res=await remote('GET');if(!res.ok)throw await error(res);return Core.normalize(await res.json());},
    async mutate(cmd){
      if(demo){const write=()=>{const db=Core.apply(localRead(),cmd,this.actor());localStorage.setItem(LOCAL,JSON.stringify(db));return db;};if(navigator.locks)return navigator.locks.request('stockflow-demo-write',write);return write();}
      for(let attempt=0;attempt<5;attempt++){
        const current=await remote('GET');if(!current.ok)throw await error(current);
        const etag=current.headers.get('ETag');if(!etag)throw new Error('The server did not provide a version check. The save was stopped; please retry.');
        const db=Core.apply(await current.json(),cmd,this.actor());
        const saved=await remote('PUT',db,etag);if(saved.status===412)continue;if(!saved.ok)throw await error(saved);return db;
      }
      throw new Error('Another seller is updating stock. Please retry; nothing was overwritten.');
    }
  };}
  root.StockFlowFirebase={signIn,signOut:()=>saveSession(null),getSession:()=>session,createStore};
})(globalThis);
