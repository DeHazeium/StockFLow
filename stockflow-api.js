(function(root){
  'use strict';
  // StockFlow v2.3: device-only cashier accounts and workspace.
  // No Firebase, API server, or network connection is required.
  const TOKEN_KEY='stockflow_cashier_token_v1';
  const SESSION_KEY='stockflow_cashier_profile_v1';
  const LOCAL_ACCOUNTS_KEY='stockflow_local_cashiers_v1';
  const LOCAL_DATA_KEY='stockflow_local_workspace_v1';
  let token=localStorage.getItem(TOKEN_KEY)||'',session=null;
  try{session=JSON.parse(localStorage.getItem(SESSION_KEY)||'null');}catch{}

  function save(auth){
    if(auth){
      token=auth.token||'';
      session={...auth.cashier,mode:'local'};
      localStorage.setItem(TOKEN_KEY,token);
      localStorage.setItem(SESSION_KEY,JSON.stringify(session));
    }else{
      token='';session=null;
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(SESSION_KEY);
    }
  }
  function normalizeId(v){return String(v||'').trim();}
  function validateLocalAccount(id,name,password,signup=false){
    id=normalizeId(id);
    if(!/^[A-Za-z0-9_-]{3,20}$/.test(id))throw new Error('Cashier ID must be 3–20 letters, numbers, _ or -.');
    password=String(password||'');
    if(password.length<6||password.length>72)throw new Error('Password must be 6–72 characters.');
    name=String(name||'').trim();
    if(signup&&(!name||name.length>60))throw new Error('Enter a cashier name up to 60 characters.');
    return {id,key:id.toLowerCase(),name,password};
  }
  function localAccounts(){try{return JSON.parse(localStorage.getItem(LOCAL_ACCOUNTS_KEY)||'{}')||{};}catch{return {};}}
  function saveLocalAccounts(accounts){localStorage.setItem(LOCAL_ACCOUNTS_KEY,JSON.stringify(accounts));}
  function randomSalt(){
    const bytes=new Uint8Array(16);
    if(root.crypto?.getRandomValues)root.crypto.getRandomValues(bytes);
    else for(let i=0;i<bytes.length;i++)bytes[i]=Math.floor(Math.random()*256);
    return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
  }
  function sha256Fallback(text){
    const raw=unescape(encodeURIComponent(text)),bytes=Array.from(raw,c=>c.charCodeAt(0)),bitLen=bytes.length*8;
    bytes.push(0x80);while(bytes.length%64!==56)bytes.push(0);
    const hi=Math.floor(bitLen/0x100000000),lo=bitLen>>>0;
    for(let i=3;i>=0;i--)bytes.push((hi>>>(i*8))&255);for(let i=3;i>=0;i--)bytes.push((lo>>>(i*8))&255);
    const H=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
    const K=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
    const r=(x,n)=>(x>>>n)|(x<<(32-n));
    for(let off=0;off<bytes.length;off+=64){
      const w=new Array(64);for(let i=0;i<16;i++){const j=off+i*4;w[i]=((bytes[j]<<24)|(bytes[j+1]<<16)|(bytes[j+2]<<8)|bytes[j+3])>>>0;}
      for(let i=16;i<64;i++){const s0=(r(w[i-15],7)^r(w[i-15],18)^(w[i-15]>>>3))>>>0,s1=(r(w[i-2],17)^r(w[i-2],19)^(w[i-2]>>>10))>>>0;w[i]=(w[i-16]+s0+w[i-7]+s1)>>>0;}
      let [a,b,c,d,e,f,g,h]=H;
      for(let i=0;i<64;i++){const S1=(r(e,6)^r(e,11)^r(e,25))>>>0,ch=((e&f)^((~e)&g))>>>0,t1=(h+S1+ch+K[i]+w[i])>>>0,S0=(r(a,2)^r(a,13)^r(a,22))>>>0,maj=((a&b)^(a&c)^(b&c))>>>0,t2=(S0+maj)>>>0;h=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;}
      H[0]=(H[0]+a)>>>0;H[1]=(H[1]+b)>>>0;H[2]=(H[2]+c)>>>0;H[3]=(H[3]+d)>>>0;H[4]=(H[4]+e)>>>0;H[5]=(H[5]+f)>>>0;H[6]=(H[6]+g)>>>0;H[7]=(H[7]+h)>>>0;
    }
    return H.map(n=>n.toString(16).padStart(8,'0')).join('');
  }
  async function passwordHash(password,salt){
    const input='StockFlow|'+salt+'|'+password;
    if(root.crypto?.subtle&&typeof root.TextEncoder==='function'){
      const data=new root.TextEncoder().encode(input),out=await root.crypto.subtle.digest('SHA-256',data);
      return Array.from(new Uint8Array(out),b=>b.toString(16).padStart(2,'0')).join('');
    }
    return sha256Fallback(input);
  }
  function localProfile(a){return {id:a.id,name:a.name,key:a.key,createdAt:a.createdAt,mode:'local'};}
  async function signUp({id,name,password}){
    const v=validateLocalAccount(id,name,password,true),accounts=localAccounts();
    if(accounts[v.key])throw new Error('That Cashier ID already exists on this phone. Sign in or choose another ID.');
    const salt=randomSalt(),account={id:v.id,key:v.key,name:v.name,salt,passwordHash:await passwordHash(v.password,salt),createdAt:Date.now()};
    accounts[v.key]=account;saveLocalAccounts(accounts);
    save({token:'local:'+v.key,cashier:localProfile(account)});
    return session;
  }
  async function signIn(id,password){
    const v=validateLocalAccount(id,'',password,false),account=localAccounts()[v.key];
    if(!account)throw new Error('Cashier ID is not saved on this phone. Create an account on this device first.');
    if(await passwordHash(v.password,account.salt)!==account.passwordHash)throw new Error('Cashier ID or password is incorrect.');
    save({token:'local:'+v.key,cashier:localProfile(account)});
    return session;
  }
  async function validateSession(){
    if(!session)return null;
    const key=String(session.key||'').toLowerCase(),account=localAccounts()[key];
    if(!account){save(null);return null;}
    session=localProfile(account);token='local:'+account.key;
    localStorage.setItem(TOKEN_KEY,token);localStorage.setItem(SESSION_KEY,JSON.stringify(session));
    return session;
  }
  function actor(){if(!session)throw new Error('Please sign in again.');return {uid:'cashier:'+session.key,email:session.name+' · '+session.id,name:session.name,id:session.id};}
  function localData(){try{return root.StockFlowCore.normalize(JSON.parse(localStorage.getItem(LOCAL_DATA_KEY)||'null'));}catch{return root.StockFlowCore.blank();}}
  function saveLocalData(data){localStorage.setItem(LOCAL_DATA_KEY,JSON.stringify(data));}
  function createStore(){
    return {
      demo:false,local:true,actor,
      async read(){return root.StockFlowCore.normalize(localData());},
      async mutate(command){const next=root.StockFlowCore.apply(localData(),command,actor());saveLocalData(next);return root.StockFlowCore.normalize(next);}
    };
  }
  root.StockFlowAPI={signIn,signUp,signOut:()=>save(null),getSession:()=>session,getMode:()=>session?'local':null,validateSession,createStore};
})(globalThis);
