(function(root){
  'use strict';
  const clone = x => JSON.parse(JSON.stringify(x));
  const IDR_PER_MYR=4333.17;
  function requireThat(ok,msg){if(!ok)throw new Error(msg);}
  function int(value,label,min=0,max=1000000000){requireThat(Number.isSafeInteger(value)&&value>=min&&value<=max,`${label} must be a whole number between ${min} and ${max.toLocaleString()}.`);return value;}
  function text(value,label,max=160){requireThat(typeof value==='string'&&value.trim().length>0&&value.trim().length<=max,`${label} is required (up to ${max} characters).`);return value.trim();}
  function blank(){return {version:1,products:{},sales:{},movements:{},operations:{}};}
  function normalize(data){return {...blank(),...(data||{}),products:data?.products||{},sales:data?.sales||{},movements:data?.movements||{},operations:data?.operations||{}};}
  function product(input){
    const p={...input,name:text(input.name,'Product name'),sku:text(input.sku,'SKU',40).toUpperCase(),category:text(input.category,'Category',60)};
    int(p.stock,'Stock',0,1000000);int(p.price,'Selling price');int(p.lowStock,'Low stock level',0,1000000);
    if(p.promoPrice!=null)int(p.promoPrice,'Promotional price');
    requireThat(p.costRM==null||(Number.isFinite(p.costRM)&&p.costRM>=0&&p.costRM<=1000000&&Math.abs(p.costRM*100-Math.round(p.costRM*100))<0.00001),'Purchase cost must be a positive MYR amount with at most two decimals, or blank.');
    p.note=String(p.note||'').slice(0,500);p.active=p.active!==false;return p;
  }
  function canonicalName(name){return name==='Imposter Bracelet'?'Beaded Bracelet 5':name;}
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
      db.sales[cmd.id]={id:cmd.id,items,total,payment:cmd.payment,customer:String(cmd.customer||'').trim().slice(0,160),note:String(cmd.note||'').trim().slice(0,500),status:'completed',...stamp};
    }else if(cmd.type==='void'){
      const s=db.sales[cmd.saleId];requireThat(s,'Sale not found.');requireThat(s.status==='completed','This sale has already been voided.');
      const reason=text(cmd.reason,'Reason for voiding',200);
      s.items.forEach(line=>{const p=db.products[line.productId];requireThat(p,'Cannot restore stock: product not found.');int(p.stock+line.quantity,'Restored stock',0,1000000);p.stock+=line.quantity;p.updatedAt=cmd.at;movement(p.id,line.quantity,'Voided sale '+s.id.slice(-8).toUpperCase()+': '+reason);});
      Object.assign(s,{status:'voided',voidReason:reason,voidAt:cmd.at,voidBy:actor.email});
    }else throw new Error('Unknown operation.');
    db.operations[cmd.id]={type:cmd.type,...stamp};return db;
  }
  function dateKey(at){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(at));return ['year','month','day'].map(t=>parts.find(p=>p.type===t).value).join('-');}
  function summary(data,now=Date.now()){
    const db=normalize(data),sales=Object.values(db.sales).filter(s=>s.status==='completed'),products=Object.values(db.products).filter(p=>p.active),today=sales.filter(s=>dateKey(s.at)===dateKey(now));
    return {revenue:sales.reduce((n,s)=>n+s.total,0),todayRevenue:today.reduce((n,s)=>n+s.total,0),todayCount:today.length,unitsSold:sales.reduce((n,s)=>n+s.items.reduce((v,i)=>v+i.quantity,0),0),stock:products.reduce((n,p)=>n+p.stock,0),low:products.filter(p=>p.stock<=p.lowStock),count:sales.length};
  }
  function csvCell(value){let s=String(value??'');if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}
  function salesCsv(sales){const rows=[['Sale ID','Date (WIB)','Status','Seller','Customer','Payment','SKU','Product','Quantity','Unit price (IDR)','Unit price (MYR reference)','Line total (IDR)','Line total (MYR reference)','Sale total (IDR)','Sale total (MYR reference)','Note','Void reason']];for(const s of sales)for(const i of s.items)rows.push([s.id,new Date(s.at).toLocaleString('sv-SE',{timeZone:'Asia/Jakarta'}),s.status,s.by,s.customer,s.payment,i.sku,canonicalName(i.name),i.quantity,i.unitPrice,(i.unitPrice/IDR_PER_MYR).toFixed(2),i.lineTotal,(i.lineTotal/IDR_PER_MYR).toFixed(2),s.total,(s.total/IDR_PER_MYR).toFixed(2),s.note,s.voidReason||'']);return '\uFEFF'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n');}
  const api={blank,normalize,apply,summary,dateKey,salesCsv};if(typeof module!=='undefined')module.exports=api;else root.StockFlowCore=api;
})(globalThis);
