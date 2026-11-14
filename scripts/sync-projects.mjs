import fs from 'node:fs/promises';
import path from 'node:path';

const SOURCE='https://bharatcode.ai/hackathon/projects';
const OUTPUT=path.join(process.cwd(),'data','projects.json');
const EXPECTED=294;

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
  return {id:`p${String(rank).padStart(3,'0')`,rank,project_name:name,description,votes,github_stars:stars,community_score:score,github_repo:repo};
}
const res=await fetch(SOURCE);
if(!res.ok) throw new Error(`Source returned ${res.status}`);
const html=await res.text();
const cards=html.split('<article class="hackathon-project-card"').slice(1);
if(cards.length!==EXPECTED) throw new Error(`Expected ${EXPECTED} projects, received ${cards.length}`);
const projects=cards.map(parseProject).sort((a,b)=>a.rank-b.rank);
await fs.mkdir(path.dirname(OUTPUT),{recursive:true});
await fs.writeFile(OUTPUT,JSON.stringify({source:SOURCE,extracted_at:new Date().toISOString(),count:projects.length,projects},null,2)+'\n');
console.log(`Wrote ${projects.length} projects to data/projects.json`);
