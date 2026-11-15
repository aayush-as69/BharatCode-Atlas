import Nav from '@/components/Nav';
import Link from 'next/link';
import {getProjects} from '@/lib/source';
import {inspectRepository,mapLimit} from '@/lib/github';

// Rendered per request (never at build time, where network failures would be
// baked into the page). GitHub responses are cached by Next for an hour, and
// failures are remembered briefly by lib/github.js.
export const dynamic='force-dynamic';

const SAMPLE_SIZE=24;
const CONCURRENCY=4;

export default async function Intelligence(){
  const projects=await getProjects();
  const requested=['Next.js','React','Python','FastAPI','Flask','Express','MongoDB','PostgreSQL','Supabase','Tailwind CSS','LangChain','LlamaIndex','OpenAI','Gemini','Vector DB','Docker','MCP'];
  const architecture=['Frontend','Backend / API','Database','AI / LLM','RAG / Retrieval','Agents / Orchestration','Authentication','Deployment','Testing','Observability'];

  // Top-ranked projects, one row per distinct repository.
  const sample=[...new Map(projects.map(p=>[p.github_repo.toLowerCase(),p])).values()].slice(0,SAMPLE_SIZE);
  const results=await mapLimit(sample,CONCURRENCY,async p=>({...p,repo:await inspectRepository(p.github_repo,{light:true})}));
  const rows=results.filter(x=>x.repo.ok);
  const failed=results.length-rows.length;
  const rateLimited=results.some(x=>x.repo.rateLimited);

  const counts=Object.fromEntries(requested.map(t=>[t,rows.filter(x=>x.repo.technologies.includes(t)).length]));
  const archCounts=Object.fromEntries(architecture.map(t=>[t,rows.filter(x=>x.repo.architecture.includes(t)).length]));

  return <div className="shell"><Nav/><main className="main">
    <div className="eyebrow">Repository intelligence</div>
    <h1 className="title">What are these projects actually built with?</h1>
    <p className="sub">Atlas samples the {SAMPLE_SIZE} top-ranked public GitHub repositories for cross-corpus architecture signals. Individual project pages and Compare inspect selected repositories on demand. Signals are evidence-based heuristics, not claims that every detected component is actively used in production.</p>

    {failed>0&&<p className="notice section" role="status">{rows.length?`${failed} of ${results.length} repositories could not be inspected, so counts below are partial.`:'No repositories could be inspected right now.'}{rateLimited?' GitHub is rate limiting Atlas; the operator can set GITHUB_TOKEN to raise the limit.':''}</p>}

    <div className="stats">
      <div className="stat"><b>{rows.length}</b><span>Repositories sampled</span></div>
      <div className="stat"><b>{rows.filter(x=>x.repo.files.readme_found).length}</b><span>READMEs found</span></div>
      <div className="stat"><b>{rows.reduce((n,x)=>n+x.repo.files.count,0).toLocaleString()}</b><span>Tracked files sampled</span></div>
    </div>

    <div className="panel section">
      <div className="sectionhead"><div><h2>Architecture fingerprints</h2><p>Structural signals found in dependency manifests, repository paths and README terms.</p></div></div>
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
      <div className="list">{rows.map(x=><Link key={x.id} href={'/projects/'+encodeURIComponent(x.id)}>
        <b>#{x.rank} {x.project_name}</b>
        <small>{x.repo.repository.language||'Unknown'} · {x.repo.architecture.join(', ')||'No architecture signals'}</small>
      </Link>)}</div>
    </div>
  </main></div>;
}
