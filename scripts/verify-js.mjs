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

// Build-time dataset integrity check (previously only enforced at runtime).
const EXPECTED=294;
const dataPath=path.join(root,'data','projects.json');
if(!fs.existsSync(dataPath)){
  console.error('Dataset verification failed: data/projects.json is missing.');
  process.exit(1);
}
let dataset;
try{
  dataset=JSON.parse(fs.readFileSync(dataPath,'utf8'));
}catch(error){
  console.error('Dataset verification failed: data/projects.json is not valid JSON.');
  process.exit(1);
}
const projects=Array.isArray(dataset?.projects)?dataset.projects:dataset;
if(!Array.isArray(projects)||projects.length!==EXPECTED){
  console.error(`Dataset verification failed: expected ${EXPECTED} projects, received ${Array.isArray(projects)?projects.length:'invalid'}.`);
  process.exit(1);
}
const ids=new Set(projects.map(p=>p.id));
if(ids.size!==EXPECTED){
  console.error('Dataset verification failed: project IDs are not unique.');
  process.exit(1);
}
const broken=projects.filter(p=>!p.project_name||!p.github_repo||!p.github_repo.includes('github.com'));
if(broken.length){
  console.error(`Dataset verification failed: ${broken.length} project rows are missing a name or a valid GitHub repository URL.`);
  process.exit(1);
}
const repoCounts=new Map();
for(const p of projects) repoCounts.set(p.github_repo,(repoCounts.get(p.github_repo)||0)+1);
const duplicateRepos=[...repoCounts.entries()].filter(([,count])=>count>1);
if(duplicateRepos.length){
  console.warn(`Dataset warning: ${duplicateRepos.length} repository URL(s) appear in more than one project row (flagged, not fatal):`,duplicateRepos.map(([url])=>url));
}

console.log(`JavaScript-only verification passed: ${files.length} repository files inspected.`);
console.log(`Dataset verification passed: ${projects.length} projects, unique IDs, all with repository URLs.`);
