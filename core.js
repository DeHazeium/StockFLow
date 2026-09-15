(function(root){
  'use strict';
  const clone = x => JSON.parse(JSON.stringify(x));
  const IDR_PER_MYR=4333.17;
  function requireThat(ok,msg){if(!ok)throw new Error(msg);}
  function int(value,label,min=0,max=1000000000){requireThat(Number.isSafeInteger(value)&&value>=min&&value<=max,`${label} must be a whole number between ${min} and ${max.toLocaleString()}.`);return value;}
  function text(value,label,max=160){requireThat(typeof value==='string'&&value.trim().length>0&&value.trim().length<=max,`${label} is required (up to ${max} characters).`);return value.trim();}
  function blank(){return {version:1,products:{},sales:{},movements:{},operations:{},shifts:{}};}
  function normalize(data){return {...blank(),...(data||{}),products:data?.products||{},sales:data?.sales||{},movements:data?.movements||{},operations:data?.operations||{},shifts:data?.shifts||{}};}
  function product(input){
    const p={...input,name:text(input.name,'Product name'),sku:text(input.sku,'SKU',40).toUpperCase(),category:text(input.category,'Category',60)};
    int(p.stock,'Stock',0,1000000);int(p.price,'Selling price');int(p.lowStock,'Low stock level',0,1000000);
    if(p.promoPrice!=null)int(p.promoPrice,'Promotional price');
    requireThat(p.costRM==null||(Number.isFinite(p.costRM)&&p.costRM>=0&&p.costRM<=1000000&&Math.abs(p.costRM*100-Math.round(p.costRM*100))<0.00001),'Purchase cost must be a positive MYR amount with at most two decimals, or blank.');
    p.note=String(p.note||'').slice(0,500);p.active=p.active!==false;return p;
  }
  function canonicalName(name){
    const raw=String(name||'').trim();
    const low=raw.toLowerCase();
    if(low.startsWith('imposter bracelet'))return 'Beaded Bracelet 5';
    if(low==='pua kumbu scaft')return 'Pua Kumbu Scarf';
    return raw;
  }
  function matchKey(value){
    return canonicalName(value).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
  }
  function catalogNameKeys(target){
    const keys=new Set([matchKey(target.name)]);
    if(target.id==='sw10'){keys.add(matchKey('Imposter Bracelet'));keys.add(matchKey('Imposter bracelet (One and only bracelet among keychain and earring in photo)'));}
    if(target.id==='sw11')keys.add(matchKey('Beaded Necklace'));
    if(target.id==='sw12')keys.add(matchKey('Pua Kumbu Scaft'));
    return keys;
  }
  function catalogRestockPlan(data,targets){
    const db=normalize(data),products=Object.values(db.products||{}),used=new Set(),rows=[];
    for(const target of targets||[]){
      let found=null,matchBy='';
      const take=(candidate,how)=>{if(candidate&&!used.has(candidate.id)){found=candidate;matchBy=how;used.add(candidate.id);return true;}return false;};
      if(target.id&&take(db.products[target.id],'id')){}
      else if(target.sku){
        const sku=String(target.sku).trim().toUpperCase();
        const candidate=products.find(p=>!used.has(p.id)&&String(p.sku||'').trim().toUpperCase()===sku);
        if(take(candidate,'sku')){}
      }
      if(!found&&target.name){
        const exact=matchKey(target.name);
        const candidate=products.find(p=>!used.has(p.id)&&matchKey(p.name)===exact);
        take(candidate,'name');
      }
      if(!found&&target.name){
        const aliases=catalogNameKeys(target);
        let candidates=products.filter(p=>!used.has(p.id)&&aliases.has(matchKey(p.name)));
        if(candidates.length>1&&Number.isFinite(target.price)){
          const priced=candidates.filter(p=>Number(p.price)===Number(target.price));
          if(priced.length)candidates=priced;
        }
        take(candidates[0],'legacy name');
      }
      const targetStock=Number(target.stock);
      rows.push({
        target,
        productId:found?.id||null,
        current:found?.stock??null,
        targetStock,
        exists:!!found,
        recreated:!found,
        needsChange:!found||found.stock!==targetStock||found.active===false,
        matchBy
      });
    }
    return {
      rows,
      changedCount:rows.filter(r=>r.needsChange).length,
      missingCount:rows.filter(r=>!r.exists).length,
      totalUnits:rows.reduce((n,r)=>n+(Number.isFinite(r.targetStock)?r.targetStock:0),0)
    };
  }
  function shiftSummary(data,closedAt=Date.now()){
    const db=normalize(data);
    requireThat(Number.isFinite(closedAt)&&closedAt>0,'Invalid shift closing time.');
    const previous=Object.values(db.shifts).filter(s=>Number.isFinite(s.closedAt)&&s.closedAt<closedAt).sort((a,b)=>b.closedAt-a.closedAt)[0]||null;
    const fromAt=previous?.closedAt||0;
    const sales=Object.values(db.sales).filter(s=>Number.isFinite(s.at)&&s.at>fromAt&&s.at<=closedAt).sort((a,b)=>a.at-b.at).map(clone);
    const movements=Object.values(db.movements).filter(m=>Number.isFinite(m.at)&&m.at>fromAt&&m.at<=closedAt).sort((a,b)=>a.at-b.at).map(clone);
    const completed=sales.filter(s=>s.status==='completed'),voided=sales.filter(s=>s.status==='voided');
    // Firebase RTDB keys cannot contain '/', '.', '#', '$', '[' or ']'.
    // Keep payment labels as sale values, but store shift totals under RTDB-safe field names.
    const paymentTotals={cash:0,qrBankTransfer:0,card:0};
    completed.forEach(s=>{
      const key=s.payment==='Cash'?'cash':s.payment==='QR / bank transfer'?'qrBankTransfer':'card';
      paymentTotals[key]=(paymentTotals[key]||0)+s.total;
    });
    const inventory=Object.values(db.products).filter(p=>p.active).sort((a,b)=>String(a.sku).localeCompare(String(b.sku))).map(p=>({id:p.id,sku:p.sku,name:canonicalName(p.name),stock:p.stock,lowStock:p.lowStock,price:p.price,promoPrice:p.promoPrice??null,costRM:p.costRM??null}));
    const firstRecord=Math.min(...sales.map(s=>s.at),...movements.map(m=>m.at),closedAt);
    return {
      fromAt,
      startedAt:previous?.closedAt||firstRecord,
      closedAt,
      sales,
      movements,
      inventory,
      completedCount:completed.length,
      voidedCount:voided.length,
      grossRevenue:completed.reduce((n,s)=>n+s.total,0),
      unitsSold:completed.reduce((n,s)=>n+s.items.reduce((v,i)=>v+i.quantity,0),0),
      paymentTotals,
      stockOnHand:inventory.reduce((n,p)=>n+p.stock,0),
      lowStockCount:inventory.filter(p=>p.stock<=p.lowStock).length,
      productCount:inventory.length
    };
  }
  function apply(data,cmd,actor){
    const db=normalize(clone(data||blank()));
    Object.values(db.products).forEach(p=>{p.name=canonicalName(p.name);});
    Object.values(db.sales).forEach(s=>{(s.items||[]).forEach(i=>{i.name=canonicalName(i.name);});});
    text(cmd.id,'Operation ID',120);text(actor.uid,'Seller ID',128);text(actor.email,'Seller',160);
    if(db.operations[cmd.id])return db;
    requireThat(Number.isFinite(cmd.at)&&cmd.at>0,'Invalid date.');
    const stamp={at:cmd.at,by:actor.email,uid:actor.uid};
    function movement(id,delta,reason){db.movements[cmd.id+'_'+id]={productId:id,delta,reason,...stamp};}
    if(cmd.type==='seed'){
      requireThat(Object.keys(db.products).length===0&&Object.keys(db.sales).length===0,'The catalogue can only be loaded into an empty inventory.');
      cmd.products.forEach(raw=>{const p=product(raw);db.products[p.id]={...p,updatedAt:cmd.at};movement(p.id,p.stock,'Opening stock from SUCCESS26 catalogue');});
    }else if(cmd.type==='product'){
      const old=db.products[cmd.product.id];
      if(old)requireThat(old.updatedAt===cmd.expectedUpdatedAt,'This product changed on another device. Close this form and reopen it to use the latest details.');
      const p=product({...cmd.product,stock:old?old.stock:cmd.product.stock});
      requireThat(!Object.values(db.products).some(x=>x.id!==p.id&&x.sku.toUpperCase()===p.sku),'Another product already uses this SKU.');
      db.products[p.id]={...p,updatedAt:cmd.at};if(!old)movement(p.id,p.stock,'Opening stock');
    }else if(cmd.type==='stock'){
      const p=db.products[cmd.productId];requireThat(p,'Product not found.');
      int(cmd.delta,'Stock change',-1000000,1000000);requireThat(cmd.delta!==0,'Enter a non-zero stock change.');
      text(cmd.reason,'Reason',200);int(p.stock+cmd.delta,'Resulting stock',0,1000000);
      p.stock+=cmd.delta;p.updatedAt=cmd.at;movement(p.id,cmd.delta,cmd.reason);
    }else if(cmd.type==='catalog_restock'){
      requireThat(Array.isArray(cmd.targets)&&cmd.targets.length>0&&cmd.targets.length<=100,'Restock targets are missing.');
      const plan=catalogRestockPlan(db,cmd.targets);
      for(const row of plan.rows){
        const target=row.target,targetStock=int(target.stock,'Original catalogue stock',0,1000000);
        if(row.exists){
          const p=db.products[row.productId],delta=targetStock-p.stock;
          p.name=canonicalName(p.name);
          if(p.active===false)p.active=true;
          if(delta!==0||p.updatedAt==null||row.needsChange){p.stock=targetStock;p.updatedAt=cmd.at;}
          if(delta!==0)movement(p.id,delta,'Restock to original SUCCESS26 catalogue quantity');
          else if(row.needsChange)movement(p.id,0,'Restored SUCCESS26 catalogue item to active inventory');
        }else{
          requireThat(target&&target.id&&target.sku&&target.name&&target.category,'A missing catalogue item cannot be recreated because its product details are incomplete. Refresh StockFlow and try Restock again.');
          requireThat(!db.products[target.id],`Cannot recreate ${target.name}: product ID ${target.id} is already in use.`);
          const p=product({...target,stock:targetStock,active:true});
          db.products[p.id]={...p,name:canonicalName(p.name),updatedAt:cmd.at};
          movement(p.id,p.stock,'Recreated missing SUCCESS26 catalogue item at original quantity');
        }
      }
    }else if(cmd.type==='sale'){
      requireThat(Array.isArray(cmd.items)&&cmd.items.length>0&&cmd.items.length<=100,'Add at least one product (maximum 100 lines).');
      requireThat(['Cash','QR / bank transfer','Card'].includes(cmd.payment),'Choose a valid payment method.');
      requireThat(!db.sales[cmd.id],'Sale ID already exists.');
      const seen=new Set();let total=0;
      const items=cmd.items.map(line=>{
        const p=db.products[line.productId];requireThat(p&&p.active,'A product is no longer available. Remove it from this sale.');
        requireThat(!seen.has(p.id),'Duplicate product in sale.');seen.add(p.id);
        int(line.quantity,'Quantity',1,1000000);int(line.unitPrice,'Unit price');
        requireThat(p.stock>=line.quantity,`${p.name}: only ${p.stock} left in stock.`);
        const lineTotal=line.quantity*line.unitPrice;int(lineTotal,'Line total',0,1000000000000);total+=lineTotal;
        p.stock-=line.quantity;p.updatedAt=cmd.at;movement(p.id,-line.quantity,'Sale '+cmd.id.slice(-8).toUpperCase());
        return {productId:p.id,name:p.name,sku:p.sku,quantity:line.quantity,unitPrice:line.unitPrice,lineTotal,costRM:p.costRM??null};
      });
      int(total,'Sale total',0,1000000000000);
      db.sales[cmd.id]={id:cmd.id,items,total,payment:cmd.payment,customer:String(cmd.customer||'').trim().slice(0,160),customerPhone:String(cmd.customerPhone||'').trim().slice(0,32),note:String(cmd.note||'').trim().slice(0,500),status:'completed',...stamp};
    }else if(cmd.type==='void'){
      const s=db.sales[cmd.saleId];requireThat(s,'Sale not found.');requireThat(s.status==='completed','This sale has already been voided.');
      const reason=text(cmd.reason,'Reason for voiding',200);
      s.items.forEach(line=>{const p=db.products[line.productId];requireThat(p,'Cannot restore stock: product not found.');int(p.stock+line.quantity,'Restored stock',0,1000000);p.stock+=line.quantity;p.updatedAt=cmd.at;movement(p.id,line.quantity,'Voided sale '+s.id.slice(-8).toUpperCase()+': '+reason);});
      Object.assign(s,{status:'voided',voidReason:reason,voidAt:cmd.at,voidBy:actor.email});
    }else if(cmd.type==='close_shift'){
      const snap=shiftSummary(db,cmd.at);
      db.shifts[cmd.id]={id:cmd.id,...snap,note:String(cmd.note||'').trim().slice(0,500),...stamp};
    }else throw new Error('Unknown operation.');
    db.operations[cmd.id]={type:cmd.type,...stamp};return db;
  }
  function dateKey(at){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(at));return ['year','month','day'].map(t=>parts.find(p=>p.type===t).value).join('-');}
  function summary(data,now=Date.now()){
    const db=normalize(data),sales=Object.values(db.sales).filter(s=>s.status==='completed'),products=Object.values(db.products).filter(p=>p.active),today=sales.filter(s=>dateKey(s.at)===dateKey(now));
    return {revenue:sales.reduce((n,s)=>n+s.total,0),todayRevenue:today.reduce((n,s)=>n+s.total,0),todayCount:today.length,unitsSold:sales.reduce((n,s)=>n+s.items.reduce((v,i)=>v+i.quantity,0),0),stock:products.reduce((n,p)=>n+p.stock,0),low:products.filter(p=>p.stock<=p.lowStock),count:sales.length};
  }
  function csvCell(value){let s=String(value??'');if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}
  function salesCsv(sales){const rows=[['Sale ID','Date (WIB)','Status','Seller','Customer','Customer WhatsApp','Payment','SKU','Product','Quantity','Unit price (IDR)','Unit price (MYR reference)','Line total (IDR)','Line total (MYR reference)','Sale total (IDR)','Sale total (MYR reference)','Note','Void reason']];for(const s of sales)for(const i of s.items)rows.push([s.id,new Date(s.at).toLocaleString('sv-SE',{timeZone:'Asia/Jakarta'}),s.status,s.by,s.customer,s.customerPhone||'',s.payment,i.sku,canonicalName(i.name),i.quantity,i.unitPrice,(i.unitPrice/IDR_PER_MYR).toFixed(2),i.lineTotal,(i.lineTotal/IDR_PER_MYR).toFixed(2),s.total,(s.total/IDR_PER_MYR).toFixed(2),s.note,s.voidReason||'']);return '\uFEFF'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n');}
  const api={blank,normalize,apply,summary,shiftSummary,dateKey,salesCsv,canonicalName,catalogRestockPlan};if(typeof module!=='undefined')module.exports=api;else root.StockFlowCore=api;
})(globalThis);
