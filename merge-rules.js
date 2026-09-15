// Offline merge only. Does not contact Firebase or deploy anything.
const fs=require('node:fs'),path=require('node:path');
const [input,output]=process.argv.slice(2);
if(!input||!output){console.error('Usage: node merge-rules.js current-live-rules.json merged-rules.json');process.exit(1);}
try{
  const current=JSON.parse(fs.readFileSync(input,'utf8').replace(/^\uFEFF/,''));
  const additions=JSON.parse(fs.readFileSync(path.join(__dirname,'database.rules.additions.json'),'utf8'));
  if(!current.rules||typeof current.rules!=='object'||Array.isArray(current.rules))throw new Error('Input must have a rules object. Export the CURRENT rules from Firebase.');
  if(![undefined,false,'false'].includes(current.rules['.read'])||![undefined,false,'false'].includes(current.rules['.write']))throw new Error('Your root read/write rules grant broad access. Review those rules before merging; parent grants override child restrictions.');
  for(const key of Object.keys(additions.rules)){if(Object.hasOwn(current.rules,key))throw new Error(key+' already exists. Review and merge it manually to preserve the existing setup.');current.rules[key]=additions.rules[key];}
  fs.writeFileSync(output,JSON.stringify(current,null,2)+'\n',{flag:'wx'});
  console.log('Prepared '+output+'. Existing rule branches are preserved. Review it before publishing.');
}catch(e){console.error(e.message);process.exit(1);}
