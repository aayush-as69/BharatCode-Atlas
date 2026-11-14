const SOURCE='https://bharatcode.ai/hackathon/projects';

function clean(value=''){
  return value.replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&#x27;/g,"'").replace(/&quot;/g,'"').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
}

export async function getProjects(){
  const res=await fetch(SOURCE,{next:{revalidate:3600}});
  if(!res.ok) throw new Error('BharatCode project source unavailable');
  const html=await res.text();
  const cards=html.split('<article class="hackathon-project-card"').slice(1);
  return cards.map((raw,i)=>{
    const name=clean(raw.match(/<h3[^>]*>([\s\S]*?)<\/h3>/)?.[1]||'');
    const description=clean(raw.match(/class="hackathon-project-description">[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/)?.[1]||'');
    const votes=Number(raw.match(/hackathon-project-vote-total[^>]*>[\s\S]*?<strong>(\d+)<\/strong>/)?.[1]||0);
    const rank=Number(raw.match(/title="Leaderboard rank">[\s\S]*?<dd>(\d+)/)?.[1]||i+1);
    const stars=Number(raw.match(/title="GitHub stars">[\s\S]*?<dd>(\d+)/)?.[1]||0);
    const score=Number(raw.match(/Community score:\s*([\d.]+)/)?.[1]||0);
    const repo=raw.match(/class="hackathon-project-repo" href="([^"]+)"/)?.[1]||'';
    return {id:`p${String(rank).padStart(3,'0')}`,rank,project_name:name,description,votes,github_stars:stars,community_score:score,github_repo:repo};
  });
}

const SIGNALS={
  agents:{label:'AI Agents',terms:['agent','autonomous','orchestrat'],reason:'Project text mentions agent, autonomous, or orchestration concepts.'},
  rag:{label:'RAG / Retrieval',terms:['rag','retrieval','vector database','embedding'],reason:'Project text mentions retrieval, RAG, embeddings, or vector databases.'},
  security:{label:'Security',terms:['security','cyber','fraud','privacy','threat'],reason:'Project text mentions security, cyber, fraud, privacy, or threats.'},
  voice:{label:'Voice / Audio',terms:['voice','speech','audio','stt','tts'],reason:'Project text mentions voice, speech, audio, STT, or TTS.'},
  vision:{label:'Vision / OCR',terms:['vision','ocr','image','video','computer vision'],reason:'Project text mentions visual, OCR, image, or video processing.'},
  governance:{label:'Governance / Compliance',terms:['governance','compliance','policy','audit'],reason:'Project text mentions governance, compliance, policy, or audit.'},
  civic:{label:'Civic / Public',terms:['civic','municipal','government','public service','urban'],reason:'Project text mentions civic, government, public-service, municipal, or urban use cases.'},
  devtools:{label:'Developer Tools',terms:['developer','codebase','github','repository','open-source','dev tool','software development'],reason:'Project text mentions developer workflows, codebases, repositories, or software development.'}
};

export function classify(p){
  const text=(p.project_name+' '+p.description).toLowerCase();
  return Object.fromEntries(Object.entries(SIGNALS).map(([key,signal])=>[key,signal.terms.some(term=>text.includes(term))]));
}
export function signalDetails(p){
  return Object.entries(classify(p)).filter(([,active])=>active).map(([key])=>({key,label:SIGNALS[key].label,reason:SIGNALS[key].reason}));
}
export function relevance(p){
  const signalCount=Object.values(classify(p)).filter(Boolean).length;
  return Math.min(100,20+signalCount*9+(p.github_stars>20?8:0)+(p.votes>20?5:0));
}
export function hiddenGem(p){
  const signalCount=Object.values(classify(p)).filter(Boolean).length;
  return Math.min(100,Math.round(Math.min(35,p.github_stars*.8)+p.community_score*.35+signalCount*6+Math.max(0,20-p.votes)*1.2));
}
