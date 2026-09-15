// Offline helper only. It NEVER connects to Firebase or publishes rules.
// It replaces only the stockFlow branch in an exported rules JSON and preserves every other branch.
const fs=require('node:fs'),path=require('node:path');
const [input,output]=process.argv.slice(2);
if(!input||!output){console.error('Usage: node update-stockflow-rules.js current-live-rules.json merged-rules.json');process.exit(1);}
try{
  const current=JSON.parse(fs.readFileSync(input,'utf8').replace(/^\uFEFF/,''));
  const add=JSON.parse(fs.readFileSync(path.join(__dirname,'database.rules.additions.json'),'utf8'));
  if(!current.rules||typeof current.rules!=='object'||Array.isArray(current.rules))throw new Error('Input must contain a top-level rules object exported from Firebase RTDB.');
  current.rules.stockFlow=add.rules.stockFlow;
  fs.writeFileSync(output,JSON.stringify(current,null,2)+'\n',{flag:'wx'});
  console.log('Prepared '+output+'. Only the stockFlow rule branch was replaced. Review it, then publish it manually in Firebase Console.');
}catch(e){console.error(e.message);process.exit(1);}
