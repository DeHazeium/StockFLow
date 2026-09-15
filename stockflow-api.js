(function(root){
  'use strict';
  // StockFlow v2.6: shared Firebase Realtime Database workspace with no cashier login UI.
  // Uses the existing Firebase RTDB URL/path. Firebase Authentication is intentionally not used.
  const CFG=root.MB_FIREBASE_CONFIG||{};
  const Core=root.StockFlowCore;
  const ACTOR={uid:'stockflow-shared-counter',email:'StockFlow Counter',name:'StockFlow Counter',id:''};

  function actor(){return {...ACTOR};}

  async function request(url,options={}){
    let controller=null,timer=null;
    try{
      let signal=options.signal;
      if(!signal){
        if(globalThis.AbortSignal&&typeof AbortSignal.timeout==='function')signal=AbortSignal.timeout(20000);
        else if(globalThis.AbortController){controller=new AbortController();signal=controller.signal;timer=setTimeout(()=>controller.abort(),20000);}
      }
      return await fetch(url,{...options,...(signal?{signal}:{})});
    }catch(e){
      const err=new Error('Firebase connection interrupted. Check your internet connection, then retry. If a save was in progress, use Retry pending save to confirm it safely.');
      err.ambiguous=true;
      throw err;
    }finally{if(timer)clearTimeout(timer);}
  }

  async function firebaseError(response){
    const d=await response.json().catch(()=>({}));
    const msg=d.error?.message||d.error||'Firebase request failed';
    if(response.status===401||response.status===403||/permission_denied|Permission denied/i.test(String(msg))){
      return new Error('Firebase RTDB denied access. StockFlow is now no-login, so publish the included no-login rule for stockFlow/data once, then tap Try again. Your Firebase project and data path stay unchanged.');
    }
    return new Error(String(msg));
  }

  function databaseUrl(){
    const base=String(CFG.databaseURL||'').replace(/\/$/,'');
    if(!base)throw new Error('Firebase RTDB is not configured. Keep firebase-config.js beside StockFlow and reload.');
    return base+'/stockFlow/data.json';
  }

  async function remote(method,body,etag){
    return request(databaseUrl(),{
      method,
      cache:'no-store',
      headers:{
        'Content-Type':'application/json',
        ...(method==='GET'?{'X-Firebase-ETag':'true'}:{}),
        ...(etag?{'if-match':etag}:{})
      },
      ...(body===undefined?{}:{body:JSON.stringify(body)})
    });
  }

  function createStore(){
    return {
      demo:false,
      remote:true,
      actor,
      async read(){
        const res=await remote('GET');
        if(!res.ok)throw await firebaseError(res);
        return Core.normalize(await res.json());
      },
      async mutate(cmd){
        for(let attempt=0;attempt<5;attempt++){
          const current=await remote('GET');
          if(!current.ok)throw await firebaseError(current);
          const etag=current.headers.get('ETag');
          if(!etag)throw new Error('Firebase did not provide a version check. The save was stopped; please retry.');
          const db=Core.apply(await current.json(),cmd,actor());
          const saved=await remote('PUT',db,etag);
          if(saved.status===412)continue;
          if(!saved.ok)throw await firebaseError(saved);
          return Core.normalize(db);
        }
        throw new Error('Another device is updating StockFlow right now. Please retry; nothing was overwritten.');
      }
    };
  }

  root.StockFlowAPI={createStore};
})(globalThis);
