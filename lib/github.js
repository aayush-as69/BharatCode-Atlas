const API='https://api.github.com';

function parseRepoUrl(url=''){
  const m=url.match(/github\.com\/([^/]+)\/([^/#?]+)/i);
  return m?{owner:m[1],repo:m[2].replace(/\.git$/,'')}:{owner:null,repo:null};
}
const inspectionCache=new Map();
const inspectionCacheTtl=15*60*1000;
const MAX_SOURCE_PREVIEW=3500;
const BLOCKED_SOURCE_PATTERNS=[/^\.env$/i,/^\.env\./i,/credentials/i,/secret/i,/private/i,/token/i,/\.pem$/i,/\.key$/i];

// Single source of truth for technology and architecture heuristics.
// Plain alphanumeric terms are matched as plural-tolerant whole words plus
// compound prefixes (e.g. "rag" -> "RAGDesk"); structural terms such as
// "app/", "next.config" or '"react"' keep substring matching.
const TECH_RULES=[
  ['Next.js',['next.config','"next"']],['React',['"react"']],['Node.js',['package.json','node']],
  ['Python',['requirements.txt','pyproject.toml','setup.py','python']],['FastAPI',['fastapi']],['Flask',['flask']],
  ['Express',['express']],['MongoDB',['mongoose','mongodb']],['PostgreSQL',['postgres','postgresql']],
  ['Supabase',['supabase']],['Firebase',['firebase']],['Tailwind CSS',['tailwind']],
  ['LangChain',['langchain']],['LlamaIndex',['llamaindex','llama-index']],['OpenAI',['openai']],
  ['Gemini',['gemini','generativelanguage']],['Vector DB',['pinecone','qdrant','weaviate','chroma','milvus','pgvector','vector database']],
  ['Docker',['dockerfile','docker-compose']],['MCP',['model context protocol','mcp']]
];

const ARCHITECTURE_RULES=[
  ['Frontend',['app/','pages/','components/','src/components/','vite.config','next.config']],
  ['Backend / API',['api/','routes/','controllers/','server.','express','fastapi','flask']],
  ['Database',['models/','schema','prisma','mongoose','supabase','postgres','mongodb','sql']],
  ['AI / LLM',['openai','gemini','anthropic','llm','generative','model']],
  ['RAG / Retrieval',['rag','retrieval','retrieve','embedding','vector','chromadb','pinecone','qdrant','weaviate','pgvector']],
  ['Agents / Orchestration',['agent','langgraph','langchain','mcp','tool-calling','workflow']],
  ['Authentication',['authentication','oauth','jwt','session','clerk','next-auth','passport']],
  ['Deployment',['dockerfile','docker-compose','vercel.json','render.yaml','railway','fly.toml','.github/workflows']],
  ['Testing',['test/','tests/','__tests__/','jest','vitest','pytest','playwright','cypress']],
  ['Observability',['sentry','opentelemetry','logging','logger','monitoring']]
];

export function matchesTerm(lowerText,term,originalText=''){
  if(!term) return false;
  if(!/^[a-z0-9]+$/.test(term)) return lowerText.includes(term);
  const escaped=term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const start='(?:^|[^a-z0-9])';
  if(new RegExp(start+escaped+'s?(?:[^a-z0-9]|$)').test(lowerText)) return true;
  if(originalText) return new RegExp(start+escaped+'(?=[A-Z0-9])','i').test(originalText);
  return false;
}

// Redacts credential-shaped assignments such as KEY=value or "apiKey": "..."
export function redactSecrets(text){
  if(!text) return text;
  return text
    .replace(/([A-Za-z_][A-Za-z0-9_]{0,64}(?:key|secret|token|password|passwd|credential|auth)[A-Za-z0-9_]{0,64}\s*[:=]\s*)(["']?)[^\s"',;}{)]{4,}\2/gi,'$1$2[redacted]$2')
    .replace(/\b([A-Z][A-Z0-9_]{2,64})\s*=\s*(["']?)[^\s"',;}{)]{8,}\2/g,'$1=$2[redacted]$2');
}

async function github(path){
  const token=process.env.GITHUB_TOKEN;
  const res=await fetch(API+path,{headers:{accept:'application/vnd.github+json',...(token?{authorization:'Bearer '+token}:{})},next:{revalidate:3600}});
  if(!res.ok) throw new Error('GitHub API '+res.status);
  return res.json();
}
function techSignals(files,readme=''){
  const text=(files.join(' ')+' '+readme);
  return TECH_RULES.filter(([,terms])=>terms.some(t=>matchesTerm(text.toLowerCase(),t,text))).map(([name])=>name);
}
function signalEvidence(files,readme='',rules=[]){
  const text=(files.join(' ')+' '+readme);
  const lower=text.toLowerCase();
  return Object.fromEntries(rules.map(([name,terms])=>[name,terms.filter(term=>matchesTerm(lower,term,text)).slice(0,4)]).filter(([,hits])=>hits.length));
}
function architectureSignals(files,readme=''){
  const text=(files.join(' ')+' '+readme);
  return ARCHITECTURE_RULES.filter(([,terms])=>terms.some(t=>matchesTerm(text.toLowerCase(),t,text))).map(([name])=>name);
}
export async function inspectRepository(githubRepo){
  const parsed=parseRepoUrl(githubRepo);
  if(!parsed.owner||!parsed.repo) return {ok:false,error:'Invalid GitHub repository URL'};
  // Cache key by normalized owner/repo slug so aliases of the same repo share one entry.
  const slug=(parsed.owner+'/'+parsed.repo).toLowerCase();
  const cached=inspectionCache.get(slug);
  if(cached&&Date.now()-cached.time<inspectionCacheTtl) return {...cached.data,cache:'memory'};
  const {owner,repo}=parsed;
  const meta=await github('/repos/'+owner+'/'+repo);
  const tree=await github('/repos/'+owner+'/'+repo+'/git/trees/'+meta.default_branch+'?recursive=1');
  const paths=(tree.tree||[]).filter(x=>x.type==='blob').map(x=>x.path).slice(0,1000);
  let readme='';
  for(const candidate of ['README.md','readme.md','README']){
    if(paths.includes(candidate)){
      const r=await github('/repos/'+owner+'/'+repo+'/contents/'+encodeURIComponent(candidate));
      if(r.content) readme=Buffer.from(r.content,'base64').toString('utf8').slice(0,20000);
      break;
    }
  }
  const manifestNames=['package.json','requirements.txt','pyproject.toml','go.mod','Cargo.toml'];
  const manifests=paths.filter(p=>manifestNames.includes(p)||manifestNames.some(n=>p.endsWith('/'+n))).slice(0,30);
  const evidenceTech=signalEvidence(paths,readme,TECH_RULES);
  const evidenceArchitecture=signalEvidence(paths,readme,ARCHITECTURE_RULES);
  const architectureHypothesis=[];
  if(evidenceArchitecture['Frontend']) architectureHypothesis.push('Frontend layer');
  if(evidenceArchitecture['Backend / API']) architectureHypothesis.push('API / backend layer');
  if(evidenceArchitecture['Database']) architectureHypothesis.push('Persistence layer');
  if(evidenceArchitecture['RAG / Retrieval']) architectureHypothesis.push('Retrieval layer');
  if(evidenceArchitecture['AI / LLM']) architectureHypothesis.push('LLM layer');
  if(evidenceArchitecture['Agents / Orchestration']) architectureHypothesis.push('Agent orchestration');

  const priorityFiles=[
    'package.json','requirements.txt','pyproject.toml','Dockerfile','docker-compose.yml',
    '.env.example','vercel.json','.github/workflows/ci.yml','.github/workflows/main.yml',
    'src/index.js','src/main.js','src/app.js','app/api','api/index.js','server.js',
    'app/page.jsx','app/page.js','src/App.jsx','src/App.js'
  ];
  const candidateFiles=paths.filter(path=>
    (priorityFiles.includes(path)||priorityFiles.some(prefix=>path.startsWith(prefix+'/'))) &&
    !BLOCKED_SOURCE_PATTERNS.some(pattern=>pattern.test(path))
  ).slice(0,18);
  const sourceFiles=[];
  for(const filePath of candidateFiles){
    try{
      const r=await github('/repos/'+owner+'/'+repo+'/contents/'+encodeURIComponent(filePath));
      if(r.content){
        const decoded=Buffer.from(r.content,'base64').toString('utf8');
        const baseName=filePath.split('/').pop();
        const isManifest=manifestNames.includes(baseName);
        // Previews are limited to dependency manifests and always redacted;
        // other inspected files expose path and size only.
        sourceFiles.push({
          path:filePath,
          size:decoded.length,
          preview:isManifest?redactSecrets(decoded.slice(0,MAX_SOURCE_PREVIEW)):null
        });
      }
    }catch{}
  }
  const dependencySignals=[];
  for(const file of sourceFiles.filter(f=>manifestNames.includes(f.path.split('/').pop()))){
    const lower=(file.preview||'').toLowerCase();
    const checks=[
      ['OpenAI',['openai']],['Gemini',['google-generativeai','@google/generative-ai','gemini']],
      ['LangChain',['langchain']],['LlamaIndex',['llamaindex','llama-index']],['React',['"react"']],
      ['Next.js',['"next"']],['Express',['"express"']],['FastAPI',['fastapi']],['Flask',['flask']],
      ['MongoDB',['mongoose','mongodb']],['PostgreSQL',['pg','postgresql']],['Supabase',['supabase']],
      ['Vector DB',['qdrant','pinecone','weaviate','chroma','milvus','pgvector']]
    ];
    for(const [name,terms] of checks){
      if(terms.some(term=>matchesTerm(lower,term))) dependencySignals.push({technology:name,file:file.path});
    }
  }

  const sourceRoles=sourceFiles.map(f=>{
    const p=f.path.toLowerCase();
    let role='Repository configuration';
    if(p.includes('api')||p.includes('server')||p.includes('route')) role='API / backend';
    if(p.includes('app/page')||p.includes('src/app')||p.includes('src/app.')) role='Application entry';
    if(p.includes('package.json')||p.includes('requirements')||p.includes('pyproject')) role='Dependencies';
    if(p.includes('docker')) role='Deployment';
    if(p.includes('workflow')) role='CI / automation';
    return {...f,role};
  });

  const fingerprint=[];
  if(sourceRoles.some(f=>f.role==='Application entry')) fingerprint.push({layer:'Application',signal:'Application entry point detected',evidence:sourceRoles.filter(f=>f.role==='Application entry').map(f=>f.path)});
  if(sourceRoles.some(f=>f.role==='API / backend')) fingerprint.push({layer:'API / backend',signal:'Backend or API entrypoint detected',evidence:sourceRoles.filter(f=>f.role==='API / backend').map(f=>f.path)});
  if(sourceRoles.some(f=>f.role==='Dependencies')) fingerprint.push({layer:'Dependencies',signal:'Dependency manifest inspected',evidence:sourceRoles.filter(f=>f.role==='Dependencies').map(f=>f.path)});
  if(sourceRoles.some(f=>f.role==='Deployment')) fingerprint.push({layer:'Deployment',signal:'Container/deployment configuration detected',evidence:sourceRoles.filter(f=>f.role==='Deployment').map(f=>f.path)});
  if(sourceRoles.some(f=>f.role==='CI / automation')) fingerprint.push({layer:'CI / automation',signal:'CI workflow detected',evidence:sourceRoles.filter(f=>f.role==='CI / automation').map(f=>f.path)});
  if(evidenceArchitecture['RAG / Retrieval']) fingerprint.push({layer:'Retrieval',signal:'Retrieval-related repository evidence detected',evidence:evidenceArchitecture['RAG / Retrieval']});
  if(evidenceArchitecture['Agents / Orchestration']) fingerprint.push({layer:'Agents',signal:'Agent/orchestration evidence detected',evidence:evidenceArchitecture['Agents / Orchestration']});
  if(evidenceArchitecture['AI / LLM']) fingerprint.push({layer:'AI / LLM',signal:'LLM integration evidence detected',evidence:evidenceArchitecture['AI / LLM']});

  const result={
    ok:true,
    repository:{full_name:meta.full_name,description:meta.description,stars:meta.stargazers_count,forks:meta.forks_count,open_issues:meta.open_issues_count,default_branch:meta.default_branch,language:meta.language,updated_at:meta.updated_at,license:meta.license?.spdx_id||null},
    files:{count:paths.length,readme_found:Boolean(readme),manifests},
    technologies:techSignals(paths,readme),
    architecture:architectureSignals(paths,readme),
    evidence:{
      technology_detection:'Repository file paths and README content',
      sample_files:paths.slice(0,60),
      technologies:evidenceTech,
      architecture:evidenceArchitecture,
      architecture_hypothesis:architectureHypothesis,
      source_files:sourceRoles,
      architecture_fingerprint:fingerprint,
      dependency_signals:dependencySignals
    }
  };
  inspectionCache.set(slug,{time:Date.now(),data:result});
  return result;
}
