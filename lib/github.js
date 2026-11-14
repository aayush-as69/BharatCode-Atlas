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
export async function inspectRepository(githubRepo){
  const {owner,repo}=parseRepoUrl(githubRepo);
  if(!owner||!repo) return {ok:false,error:'Invalid GitHub repository URL'};
  const meta=await github('/repos/'+owner+'/'+repo);
  const tree=await github('/repos/'+owner+'/'+repo+'/git/trees/'+meta.default_branch+'?recursive=1');
  const paths=(tree.tree||[]).filter(x=>x.type==='blob').map(x=>x.path).slice(0,500);
  let readme='';
  for(const candidate of ['README.md','readme.md','README']){
    if(paths.includes(candidate)){
      const r=await github('/repos/'+owner+'/'+repo+'/contents/'+encodeURIComponent(candidate));
      if(r.content) readme=Buffer.from(r.content,'base64').toString('utf8').slice(0,20000);
      break;
    }
  }
  const manifestNames=['package.json','requirements.txt','pyproject.toml','go.mod','Cargo.toml'];
  const manifests=paths.filter(p=>manifestNames.includes(p)||manifestNames.some(n=>p.endsWith('/'+n))).slice(0,20);
  return {ok:true,repository:{full_name:meta.full_name,description:meta.description,stars:meta.stargazers_count,forks:meta.forks_count,open_issues:meta.open_issues_count,default_branch:meta.default_branch,language:meta.language,updated_at:meta.updated_at,license:meta.license?.spdx_id||null},files:{count:paths.length,readme_found:Boolean(readme),manifests},technologies:techSignals(paths,readme),evidence:{technology_detection:'Repository file paths and README content',sample_files:paths.slice(0,40)}};
}
