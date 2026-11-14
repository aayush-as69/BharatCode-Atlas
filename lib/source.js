import projectsData from '@/data/projects.json';

const EXPECTED_PROJECT_COUNT=294;

export async function getProjects(){
  const projects=Array.isArray(projectsData?.projects) ? projectsData.projects : projectsData;
  if(projects.length!==EXPECTED_PROJECT_COUNT){
    throw new Error(`Expected ${EXPECTED_PROJECT_COUNT} BharatCode projects, received ${projects.length}`);
  }
  if(new Set(projects.map(p=>p.id)).size!==EXPECTED_PROJECT_COUNT){
    throw new Error('BharatCode project IDs are not unique');
  }
  return projects.slice().sort((a,b)=>a.rank-b.rank);
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

const PERSONAL_PROFILES={
  BrandGuard:{terms:['brand','governance','compliance','security','audit','policy','risk','fraud'],signals:['security','governance']},
  Handover:{terms:['handover','developer','documentation','repository','codebase','knowledge','workflow','collaboration'],signals:['devtools','agents']},
  VoiceOps:{terms:['voice','speech','audio','stt','tts','call','conversation','agent'],signals:['voice','agents','rag']},
  MaskChat:{terms:['chat','social','mentor','matching','community','identity','auth','security'],signals:['security','agents']},
  CivicSync:{terms:['civic','municipal','government','public','urban','maintenance','complaint','citizen'],signals:['civic','governance']}
};

export function personalOpportunity(project,profileName){
  const profile=PERSONAL_PROFILES[profileName];
  if(!profile) return {score:0,reasons:[]};
  const text=(project.project_name+' '+project.description).toLowerCase();
  const termHits=profile.terms.filter(term=>text.includes(term));
  const classified=classify(project);
  const signalHits=profile.signals.filter(signal=>classified[signal]);
  const score=Math.min(100,termHits.length*12+signalHits.length*22+(project.github_stars>10?4:0));
  const reasons=[];
  if(termHits.length) reasons.push('matches '+termHits.slice(0,3).join(', '));
  if(signalHits.length) reasons.push('shares '+signalHits.map(x=>SIGNALS[x].label).join(' + ')+' signals');
  if(project.github_stars>10) reasons.push('has some GitHub traction');
  return {score,reasons};
}

export {PERSONAL_PROFILES};

export function buildUserProfile({githubData=null,building='',interests=''}={}){
  const corpus=[
    building,
    interests,
    githubData?.bio||'',
    ...(githubData?.repos||[]).flatMap(r=>[r.name,r.description||'',r.language||'',...(r.topics||[])])
  ].join(' ').toLowerCase();

  const groups={
    agents:['agent','langchain','langgraph','mcp','tool calling','orchestration','workflow'],
    rag:['rag','retrieval','embedding','vector','llamaindex','pinecone','qdrant','chroma'],
    security:['security','auth','authentication','oauth','jwt','privacy','fraud'],
    developerTools:['developer','devtool','developer tools','code','repository','github','cli','sdk'],
    voice:['voice','speech','audio','stt','tts','call','conversation'],
    vision:['vision','ocr','image','computer vision','multimodal'],
    governance:['governance','compliance','audit','policy','risk','regulation'],
    civic:['civic','government','municipal','public','urban','citizen'],
    ai:['ai','artificial intelligence','llm','generative','gemini','openai','model']
  };

  const profile={};
  for(const [key,terms] of Object.entries(groups)){
    profile[key]=terms.some(term=>corpus.includes(term));
  }

  const detected=[...new Set([
    ...(githubData?.repos||[]).map(r=>r.language).filter(Boolean),
    ...(githubData?.repos||[]).flatMap(r=>r.topics||[])
  ])].slice(0,12);

  return {profile,detected,corpus};
}

export function userOpportunity(project,userProfile){
  const profile=userProfile?.profile||{};
  const classified=classify(project);
  const matches=Object.keys(profile).filter(k=>profile[k]&&classified[k]);
  const score=Math.min(100,matches.length*18+(project.github_stars>10?4:0)+(project.community_score>70?4:0));
  const reasons=[];
  if(matches.length) reasons.push('matches '+matches.map(k=>SIGNALS[k]?.label||k).slice(0,3).join(' + ')+' interests');
  if(userProfile?.detected?.length) reasons.push('your profile mentions '+userProfile.detected.slice(0,3).join(', '));
  return {score,reasons};
}

export {EXPECTED_PROJECT_COUNT, SIGNALS};
