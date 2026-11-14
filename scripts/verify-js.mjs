import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const forbidden=['tsconfig.json','next-env.d.ts','next.config.ts'];
const forbiddenExtensions=['.ts','.tsx'];
const ignored=new Set(['node_modules','.next','.git']);

function walk(dir){
  const entries=fs.readdirSync(dir,{withFileTypes:true});
  const files=[];
  for(const entry of entries){
    if(ignored.has(entry.name)) continue;
    const full=path.join(dir,entry.name);
    if(entry.isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

const files=walk(root);
const violations=files.filter(file=>{
  const relative=path.relative(root,file);
  return forbidden.includes(relative)||forbiddenExtensions.some(ext=>relative.endsWith(ext));
});

if(violations.length){
  console.error('JavaScript-only verification failed:');
  violations.forEach(file=>console.error(' -',path.relative(root,file)));
  process.exit(1);
}

console.log(`JavaScript-only verification passed: ${files.length} repository files inspected.`);
