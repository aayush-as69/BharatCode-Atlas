const SOURCE='https://bharatcode.ai/hackathon/projects';
const EXPECTED_PROJECT_COUNT=294;

function clean(value=''){
  return value
    .replace(/<[^>]+>/g,'')
    .replace(/&amp;/g,'&')
    .replace(/&#x27;/g,"'")
    .replace(/&quot;/g,'"')
    .replace(/&nbsp;/g,' ')
    .replace(/\s+/g,' ')
    .trim();
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

  return {
    id:`p${String(rank).padStart(3,'0')}`,
    rank,
    project_name:name,
    description,
    votes,
    github_stars:stars,
    community_score:score,
    github_repo:repo
  };
}

export async function getProjects(){
  const res=await fetch(SOURCE,{next:{revalidate:3600}});
  if(!res.ok) throw new Error(`BharatCode project source unavailable (${res.status})`);

  const html=await res.text();
  const cards=html.split('<article class="hackathon-project-card"').slice(1);

  if(cards.length!==EXPECTED_PROJECT_COUNT){
    throw new Error(`Expected ${EXPECTED_PROJECT_COUNT} BharatCode projects, received ${cards.length}`);
  }

  const projects=cards.map(parseProject);

  if(new Set(projects.map(p=>p.id)).size!==EXPECTED_PROJECT_COUNT){
    throw new Error('BharatCode project IDs are not unique');
  }

  return projects.sort((a,b)=>a.rank-b.rank);
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
  return Object.fromEntries(Object.entries(SIGNALS).map(([key,signal])=>[
    key,
    signal.terms.some(term=>text.includes(term))
  ]));
}

export function signalDetails(p){
  return Object.entries(classify(p))
    .filter(([,active])=>active)
    .map(([key])=>({key,label:SIGNALS[key].label,reason:SIGNALS[key].reason}));
}

export function relevance(p){
  const signalCount=Object.values(classify(p)).filter(Boolean).length;
  return Math.min(100,20+signalCount*9+(p.github_stars>20?8:0)+(p.votes>20?5:0));
}

export function hiddenGem(p){
  const signalCount=Object.values(classify(p)).filter(Boolean).length;
  const popularityPenalty=Math.max(0,35-Math.min(35,p.votes*0.7));
  const technicalSignal=signalCount*7;
  const community=Math.min(25,p.community_score*0.25);
  const stars=Math.min(20,p.github_stars*0.45);
  return Math.min(100,Math.round(popularityPenalty+technicalSignal+community+stars));
}

export function technicalInterest(p){
  const signalCount=Object.values(classify(p)).filter(Boolean).length;
  const evidence=(p.description.length>120?10:0)+(p.github_stars>5?5:0);
  return Math.min(100,Math.round(signalCount*10+evidence));
}

export function whyHiddenGem(p){
  const reasons=[];
  if(p.votes<10) reasons.push('low vote volume');
  if(p.github_stars<20) reasons.push('limited GitHub popularity');
  const signals=signalDetails(p).map(x=>x.label);
  if(signals.length) reasons.push('strong '+signals.slice(0,2).join(' + ')+' signal');
  if(p.community_score>=70) reasons.push('solid community score');
  return reasons.length?reasons.join(' · '):'mixed popularity and technical signals';
}

export function architectureProfile(project, repository=null){
  const sourceSignals=signalDetails(project);
  const repoTech=repository?.technologies||[];
  const repoArchitecture=repository?.architecture||[];
  const combined=new Set([...sourceSignals.map(x=>x.label),...repoTech,...repoArchitecture]);

  const dimensions={
    agents: combined.has('AI Agents') || combined.has('Agents / Orchestration'),
    rag: combined.has('RAG / Retrieval'),
    security: combined.has('Security') || combined.has('Authentication'),
    developerTools: combined.has('Developer Tools'),
    voice: combined.has('Voice / Audio'),
    vision: combined.has('Vision / OCR'),
    governance: combined.has('Governance / Compliance'),
    civic: combined.has('Civic / Public'),
    ai: combined.has('AI / LLM') || combined.has('AI Agents') || combined.has('RAG / Retrieval'),
    frontend: combined.has('Frontend'),
    backend: combined.has('Backend / API'),
    database: combined.has('Database'),
    deployment: combined.has('Deployment'),
    testing: combined.has('Testing'),
    observability: combined.has('Observability')
  };

  const evidence=[];
  if(sourceSignals.length) evidence.push('BharatCode project description');
  if(repo?.technologies?.length) evidence.push('GitHub repository technology signals');
  if(repo?.architecture?.length) evidence.push('GitHub repository architecture signals');

  return {
    dimensions,
    technologies:repoTech,
    architecture:repoArchitecture,
    sourceSignals,
    evidence,
    confidence:repository?.ok ? 'repository + source evidence' : 'source-only evidence'
  };
}

export function researchScore(project, repository=null){
  const profile=architectureProfile(project,repository);
  const technical=[
    profile.dimensions.agents,
    profile.dimensions.rag,
    profile.dimensions.security,
    profile.dimensions.developerTools,
    profile.dimensions.voice,
    profile.dimensions.vision,
    profile.dimensions.ai
  ].filter(Boolean).length;
  const engineering=[
    profile.dimensions.frontend,
    profile.dimensions.backend,
    profile.dimensions.database,
    profile.dimensions.deployment,
    profile.dimensions.testing,
    profile.dimensions.observability
  ].filter(Boolean).length;

  return Math.min(100,Math.round(
    technical*9+
    engineering*4+
    Math.min(15,project.community_score*.15)+
    Math.min(10,project.github_stars*.2)
  ));
}

export {EXPECTED_PROJECT_COUNT, SIGNALS};
