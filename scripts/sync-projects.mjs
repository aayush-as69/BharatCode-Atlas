import fs from 'node:fs/promises';
import path from 'node:path';

const SOURCE='https://bharatcode.ai/hackathon/projects';
const OUTPUT=path.join(process.cwd(),'data','projects.json');
const EXPECTED=294;

// Must stay in sync with the SIGNALS map in lib/source.js.
const SIGNAL_TERMS={
  agents:['agent','autonomous','orchestrat'],
  rag:['rag','retrieval','vector database','embedding'],
  security:['security','cyber','fraud','privacy','threat'],
  voice:['voice','speech','audio','stt','tts'],
  vision:['vision','ocr','image','video','computer vision'],
  governance:['governance','compliance','policy','audit'],
  civic:['civic','municipal','government','public service','urban'],
  devtools:['developer','codebase','github','repository','open-source','dev tool','software development']
};

function signalsFor(name,description){
  const text=(name+' '+description).toLowerCase();
  return Object.entries(SIGNAL_TERMS).filter(([,terms])=>terms.some(term=>text.includes(term))).map(([key])=>key);
}

function clean(value=''){
  return value.replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&#x27;/g,"'").replace(/&quot;/g,'"').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
}
function numberFrom(value=''){
  const match=String(value).replace(/,/g,'').match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
}
function parseProject(raw,index){
  const name=clean(raw.match(/<h3[^>]*>([\s\S]*?)<\/h3>/)?.[1]||'');
  const description=clean(raw.match(/class="hackathon-project-description">[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/)?.[1]||'');
  const votes=numberFrom(raw.match(/hackathon-project-vote-total[^>]*>[\s\S]*?<strong>(\d+)<\/strong>/)?.[1]||0);
  const rank=numberFrom(raw.match(/title="Leaderboard rank">[\s\S]*?<dd>([^<]+)/)?.[1]||index+1);
  const stars=numberFrom(raw.match(/title="GitHub stars">[\s\S]*?<dd>([^<]+)/)?.[1]||0);
  const score=numberFrom(raw.match(/Community score:\s*([\d.]+)/)?.[1]||0);
  const repo=raw.match(/class="hackathon-project-repo" href="([^"]+)"/)?.[1]||'';
  const signals=signalsFor(name,description);
  return {id:`p${String(rank).padStart(3,'0')}`,rank,project_name:name,description,votes,github_stars:stars,community_score:score,github_repo:repo,signals};
}

const res=await fetch(SOURCE);
if(!res.ok) throw new Error(`Source returned ${res.status}`);
const html=await res.text();
const cards=html.split('<article class="hackathon-project-card"').slice(1);
if(cards.length!==EXPECTED) throw new Error(`Expected ${EXPECTED} projects, received ${cards.length}`);
const projects=cards.map(parseProject).sort((a,b)=>a.rank-b.rank);

// Flag junk rows and duplicate repository URLs so upstream data issues are visible.
const junk=projects.filter(p=>!p.project_name||!p.github_repo);
const seen=new Set();
const duplicates=[];
for(const project of projects){
  if(seen.has(project.github_repo)) duplicates.push(project.github_repo);
  seen.add(project.github_repo);
}
if(junk.length) console.warn(`Warning: ${junk.length} project row(s) are missing a name or repository URL:`,junk.map(p=>p.rank));
if(duplicates.length) console.warn(`Warning: ${duplicates.length} duplicate repository URL row(s):`,[...new Set(duplicates)]);

await fs.mkdir(path.dirname(OUTPUT),{recursive:true});
await fs.writeFile(OUTPUT,JSON.stringify({source:SOURCE,extracted_at:new Date().toISOString(),count:projects.length,projects},null,2)+'\n');
console.log(`Wrote ${projects.length} projects to data/projects.json (signals precomputed)`);
