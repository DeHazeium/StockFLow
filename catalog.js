(function (root) {
  const rows = [
    ['Beaded Bracelet 1','Accessories',9,15,80000,75000,1],
    ['Brown Bracelet','Accessories',4,20,95000,90000,2],
    ['Black Bracelet','Accessories',4,20,95000,90000,2],
    ['Blue Bracelet','Accessories',4,40,190000,185000,3],
    ['Beaded Bracelet 2','Accessories',3,40,185000,180000,3],
    ['Beaded Bracelet 3','Accessories',3,35,175000,170000,4],
    ['Beaded Bracelet 4','Accessories',4,4,25000,22000,4],
    ['Assorted Earring','Accessories',6,15,85000,80000,5],
    ['Dreamcatcher Keychain','Accessories',4,15,85000,80000,5],
    ['Beaded Bracelet 5','Accessories',1,25,125000,120000,6],
    ['Beaded Necklace 1','Accessories',3,25,125000,120000,6],
    ['Pua Kumbu Scarf','Textiles',3,15,85000,80000,7],
    ['Beaded Lanyard','Accessories',4,10,65000,60000,8],
    ['Assorted Purse','Bags & purses',3,4,25000,22000,9],
    ['Pua Kumbu Purse','Bags & purses',3,5.9,40000,35000,10],
    ['Sarawak Batik Owl (Mentari)','Crafts',1,48,230000,220000,11],
    ['Sarawak Batik Owl (Biru Laut)','Crafts',1,50,230000,220000,12],
    ['Beaded Necklace 2','Accessories',1,null,230000,220000,13],
    ['Assorted Perfume','Fragrance',20,null,87000,null,13],
    ['Coffee','Food & drink',36,2,9000,8000,14]
  ];
  const catalog = rows.map((r,i) => ({id:'sw'+String(i+1).padStart(2,'0'),sku:'SW-'+String(i+1).padStart(3,'0'),name:r[0],category:r[1],stock:r[2],costRM:r[3],price:r[4],promoPrice:r[5],sourcePage:r[6],image:'assets/product-'+String(i+1).padStart(2,'0')+'.jpg',lowStock:3,active:true,note:i===6?'Reference photo only, as noted in the catalogue.':i===17?'Second necklace entry in the catalogue; purchase cost not supplied.':i===18?'Purchase cost and promotional price not supplied.':''}));
  if(typeof module !== 'undefined') module.exports=catalog; else root.StockFlowCatalog=catalog;
})(globalThis);
