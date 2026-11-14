import Nav from '@/components/Nav';
import Link from 'next/link';
import {getProjects} from '@/lib/source';
import {inspectRepository} from '@/lib/github';

export default async function Intelligence(){
  const projects=await getProjects();
  const requested=['Next.js','React','Python','FastAPI','Flask','Express','MongoDB','PostgreSQL','Supabase','Tailwind CSS','LangChain','LlamaIndex','OpenAI','Gemini','Vector DB','Docker','MCP'];
  const rows=[];
  for(const p of projects.slice(0,294)){
    try{
      const r=await inspectRepository(p.github_repo);
      if(r.ok) rows.push({...p,repo:r});
    }catch{}
  }
  const counts=Object.fromEntries(requested.map(t=>[t,rows.filter(x=>x.repo.technologies.includes(t)).length]));
  return <div className="shell"><Nav/><main className="main">
    <div className="eyebrow">Repository intelligence</div>
    <h1 className="title">What are these projects actually built with?</h1>
    <p className="sub">Atlas inspects public GitHub metadata, file paths and README content. Technology labels are evidence-based signals, not guesses from leaderboard descriptions.</p>
    <div className="stats">
      <div className="stat"><b>{rows.length}</b><span>Repositories inspected</span></div>
      <div className="stat"><b>{rows.filter(x=>x.repo.files.readme_found).length}</b><span>READMEs found</span></div>
      <div className="stat"><b>{rows.reduce((n,x)=>n+x.repo.files.count,0).toLocaleString()}</b><span>Tracked files sampled</span></div>
    </div>
    <div className="panel section">
      <div className="sectionhead"><div><h2>Technology signals</h2><p>Counts are based on repositories Atlas successfully inspected in this request.</p></div></div>
      <div className="grid">
        {requested.map(t=><div className="card" key={t}><div className="name">{t}</div><div className="metrics"><b>{counts[t]}<span> repos</span></b></div><Link className="button" style={{fontSize:11,padding:'8px 10px'}} href={'/intelligence?tech='+encodeURIComponent(t)}>Filter</Link></div>)}
      </div>
    </div>
    <div className="panel section">
      <h2>Repository results</h2>
      <div className="list">
        {rows.slice(0,40).map(x=><Link key={x.id} href={'/projects/'+x.id}><b>#{x.rank} {x.project_name}</b><small>{x.repo.repository.language||'Unknown'} · {x.repo.technologies.join(', ')||'No detected technology signals'}</small></Link>)}
      </div>
    </div>
  </main></div>;
}