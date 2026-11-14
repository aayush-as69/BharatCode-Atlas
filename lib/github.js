const API='https://api.github.com';

function parseRepoUrl(url=''){
  const m=url.match(/github\.com\/([^/]+)\/([^/#?]+)/i);
  return m?{owner:m[1],repo:m[2].replace(/\.git$/,'')}:{owner:null,repo:null};
}
async function github(path){
  const token=process.env.GITHUB_TOKEN;
  const res=await fetch(API+path,{headers:{accept:'application/vnd.github+json',...(token?{authorization:'Bearer '+token}:{})},next:{revalidate:3600}});
  if(!res.ok) throw new Error('GitHub API '+res.status);
  return res.json();
}
function techSignals(files,readme=''){
  const text=(files.join(' ')+' '+readme).toLowerCase();
  const rules=[
    ['Next.js',['next.config','"next"']],['React',['"react"']],['Node.js',['package.json','node']],
    ['Python',['requirements.txt','pyproject.toml','setup.py','python']],['FastAPI',['fastapi']],['Flask',['flask']],
    ['Express',['express']],['MongoDB',['mongoose','mongodb']],['PostgreSQL',['postgres','postgresql']],
    ['Supabase',['supabase']],['Firebase',['firebase']],['Tailwind CSS',['tailwind']],
    ['LangChain',['langchain']],['LlamaIndex',['llamaindex','llama-index']],['OpenAI',['openai']],
    ['Gemini',['gemini','generativelanguage']],['Vector DB',['pinecone','qdrant','weaviate','chroma','milvus','pgvector','vector database']],
    ['Docker',['dockerfile','docker-compose']],['MCP',['model context protocol','mcp']]
  ];
  return rules.filter(([,terms])=>terms.some(t=>text.includes(t))).map(([name])=>name);
}
function signalEvidence(files,readme='',rules=[]){
  const text=(files.join(' ')+' '+readme).toLowerCase();
  return Object.fromEntries(rules.map(([name,terms])=>[name,terms.filter(t=>text.includes(t)).slice(0,4)]).filter(([,hits])=>hits.length));
}
function architectureSignals(files,readme=''){
  const text=(files.join(' ')+' '+readme).toLowerCase();
  const rules=[
    ['Frontend', ['app/','pages/','components/','src/components/','vite.config','next.config']],
    ['Backend / API', ['api/','routes/','controllers/','server.','express','fastapi','flask']],
    ['Database', ['models/','schema','prisma','mongoose','supabase','postgres','mongodb','sql']],
    ['AI / LLM', ['openai','gemini','anthropic','llm','generative','model']],
    ['RAG / Retrieval', ['rag','retriev','embedding','vector','chromadb','pinecone','qdrant','weaviate','pgvector']],
    ['Agents / Orchestration', ['agent','langgraph','langchain','mcp','tool-calling','workflow']],
    ['Authentication', ['auth','oauth','jwt','session','clerk','next-auth','passport']],
    ['Deployment', ['dockerfile','docker-compose','vercel.json','render.yaml','railway','fly.toml','.github/workflows']],
    ['Testing', ['test/','tests/','__tests__/','jest','vitest','pytest','playwright','cypress']],
    ['Observability', ['sentry','opentelemetry','logging','logger','monitoring']]
  ];
  return rules.filter(([,terms])=>terms.some(t=>text.includes(t))).map(([name])=>name);
}
export async function inspectRepository(githubRepo){
  const {owner,repo}=parseRepoUrl(githubRepo);
  if(!owner||!repo) return {ok:false,error:'Invalid GitHub repository URL'};
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
  const techRules=[
    ['Next.js',['next.config','"next"']],['React',['"react"']],['Node.js',['package.json','node']],
    ['Python',['requirements.txt','pyproject.toml','setup.py','python']],['FastAPI',['fastapi']],['Flask',['flask']],
    ['Express',['express']],['MongoDB',['mongoose','mongodb']],['PostgreSQL',['postgres','postgresql']],
    ['Supabase',['supabase']],['Firebase',['firebase']],['Tailwind CSS',['tailwind']],['LangChain',['langchain']],
    ['LlamaIndex',['llamaindex','llama-index']],['OpenAI',['openai']],['Gemini',['gemini','generativelanguage']],
    ['Vector DB',['pinecone','qdrant','weaviate','chroma','milvus','pgvector','vector database']],
    ['Docker',['dockerfile','docker-compose']],['MCP',['model context protocol','mcp']]
  ];
  const architectureRules=[
    ['Frontend',['app/','pages/','components/','src/components/','vite.config','next.config']],
    ['Backend / API',['api/','routes/','controllers/','server.','express','fastapi','flask']],
    ['Database',['models/','schema','prisma','mongoose','supabase','postgres','mongodb','sql']],
    ['AI / LLM',['openai','gemini','anthropic','llm','generative','model']],
    ['RAG / Retrieval',['rag','retriev','embedding','vector','chromadb','pinecone','qdrant','weaviate','pgvector']],
    ['Agents / Orchestration',['agent','langgraph','langchain','mcp','tool-calling','workflow']],
    ['Authentication',['auth','oauth','jwt','session','clerk','next-auth','passport']],
    ['Deployment',['dockerfile','docker-compose','vercel.json','render.yaml','railway','fly.toml','.github/workflows']],
    ['Testing',['test/','tests/','__tests__/','jest','vitest','pytest','playwright','cypress']],
    ['Observability',['sentry','opentelemetry','logging','logger','monitoring']]
  ];
  const evidenceTech=signalEvidence(paths,readme,techRules);
  const evidenceArchitecture=signalEvidence(paths,readme,architectureRules);
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
  const candidateFiles=paths.filter(path=>priorityFiles.includes(path)||priorityFiles.some(prefix=>path.startsWith(prefix+'/'))).slice(0,18);
  const sourceFiles=[];
  for(const filePath of candidateFiles){
    try{
      const r=await github('/repos/'+owner+'/'+repo+'/contents/'+encodeURIComponent(filePath));
      if(r.content){
        const decoded=Buffer.from(r.content,'base64').toString('utf8');
        sourceFiles.push({
          path:filePath,
          size:decoded.length,
          preview:decoded.slice(0,3500)
        });
      }
    }catch{}
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
  return {
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
      source_files:sourceRoles
    }
  };
}
