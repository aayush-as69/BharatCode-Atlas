import Nav from '@/components/Nav';
import Link from 'next/link';
import {getProjects} from '@/lib/source';
import {inspectRepository} from '@/lib/github';

export default async function Intelligence(){
  const projects=await getProjects();
  const requested=['Next.js','React','Python','FastAPI','Flask','Express','MongoDB','PostgreSQL','Supabase','Tailwind CSS','LangChain','LlamaIndex','OpenAI','Gemini','Vector DB','Docker','MCP'];
  const sample=projects.filter((p,i)=>i<24||i%12===0).slice(0,48);
  const rows=[];
  for(const p of sample){
    try{
      const r=await inspectRepository(p.github_repo);
      if(r.ok) rows.push({...p,repo:r});
    }catch{}
  }
  const counts=Object.fromEntries(requested.map(t=>[t,rows.filter(x=>x.repo.technologies.includes(t)).length]));
  const architecture=['Frontend','Backend / API','Database','AI / LLM','RAG / Retrieval','Agents / Orchestration','Authentication','Deployment','Testing','Observability'];
  const archCounts=Object.fromEntries(architecture.map(t=>[t,rows.filter(x=>x.repo.architecture.includes(t)).length]));

  return <div className="shell"><Nav/><main className="main">
    <div className="eyebrow">Repository intelligence</div>
    <h1 className="title">What are these projects actually built with?</h1>
    <p className="sub">Atlas samples a bounded set of public GitHub repositories for cross-corpus architecture signals. Individual project pages and Compare inspect selected repositories on demand. Signals are evidence-based heuristics, not claims that every detected component is actively used in production.</p>

    <div className="stats">
      <div className="stat"><b>{rows.length}</b><span>Repositories sampled</span></div>
      <div className="stat"><b>{rows.filter(x=>x.repo.files.readme_found).length}</b><span>READMEs found</span></div>
      <div className="stat"><b>{rows.reduce((n,x)=>n+x.repo.files.count,0).toLocaleString()}</b><span>Tracked files sampled</span></div>
    </div>

    <div className="panel section">
      <div className="sectionhead"><div><h2>Architecture fingerprints</h2><p>Structural signals found across repository paths and README content.</p></div></div>
      <div className="grid">{architecture.map(t=><div className="card" key={t}>
        <div className="name">{t}</div>
        <div className="metrics"><b>{archCounts[t]}<span> repos</span></b></div>
      </div>)}</div>
    </div>

    <div className="panel section">
      <div className="sectionhead"><div><h2>Technology signals</h2><p>Repository evidence, not leaderboard-description guesses.</p></div></div>
      <div className="grid">{requested.map(t=><div className="card" key={t}>
        <div className="name">{t}</div>
        <div className="metrics"><b>{counts[t]}<span> repos</span></b></div>
      </div>)}</div>
    </div>

    <div className="panel section">
      <h2>Repository results</h2>
      <div className="list">{rows.slice(0,60).map(x=><Link key={x.id} href={'/projects/'+x.id}>
        <b>#{x.rank} {x.project_name}</b>
        <small>{x.repo.repository.language||'Unknown'} · {x.repo.architecture.join(', ')||'No architecture signals'}</small>
      </Link>)}</div>
    </div>
  </main></div>;
}