(function(root){
  'use strict';
  const TOKEN_KEY='stockflow_cashier_token_v1',SESSION_KEY='stockflow_cashier_profile_v1';
  let token=localStorage.getItem(TOKEN_KEY)||'',session=null;
  try{session=JSON.parse(localStorage.getItem(SESSION_KEY)||'null');}catch{}
  function save(auth){if(auth){token=auth.token;session=auth.cashier;localStorage.setItem(TOKEN_KEY,token);localStorage.setItem(SESSION_KEY,JSON.stringify(session));}else{token='';session=null;localStorage.removeItem(TOKEN_KEY);localStorage.removeItem(SESSION_KEY);}}
  async function request(path,options={}){let res;try{res=await fetch('/api'+path,{...options,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),...(options.headers||{})},signal:AbortSignal.timeout(20000)});}catch(e){const err=new Error('Connection interrupted. Check your internet connection and retry.');err.ambiguous=true;throw err;}const data=await res.json().catch(()=>({}));if(!res.ok){if(res.status===401){save(null);throw new Error(data.error||'Your session expired. Please sign in again.');}throw new Error(data.error||'Request failed.');}return data;}
  async function signIn(id,password){const auth=await request('/login',{method:'POST',body:JSON.stringify({id,password})});save(auth);return session;}
  async function signUp({id,name,password}){const auth=await request('/signup',{method:'POST',body:JSON.stringify({id,name,password})});save(auth);return session;}
  async function validateSession(){if(!token||!session)return null;try{const data=await request('/me');session=data.cashier;localStorage.setItem(SESSION_KEY,JSON.stringify(session));return session;}catch(e){if(!token)return null;return session;}}
  function actor(){if(!session)throw new Error('Please sign in again.');return {uid:'cashier:'+session.key,email:session.name+' · '+session.id,name:session.name,id:session.id};}
  function createStore(){return {demo:false,actor,async read(){const r=await request('/data');return root.StockFlowCore.normalize(r.data);},async mutate(command){const r=await request('/mutate',{method:'POST',body:JSON.stringify({command})});return root.StockFlowCore.normalize(r.data);}};}
  root.StockFlowAPI={signIn,signUp,signOut:()=>save(null),getSession:()=>session,validateSession,createStore};
})(globalThis);
