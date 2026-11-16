import Link from 'next/link';
import Nav from '@/components/Nav';
import ProjectCard from '@/components/ProjectCard';
import {getProjects,classify,hiddenGem,SIGNALS} from '@/lib/source';

const categories=['agents','rag','security','voice','vision','governance','civic','devtools'];

export default async function Home(){
  const projects=await getProjects();
  const classified=projects.map(p=>classify(p));
  const counts=Object.fromEntries(categories.map(k=>[k,classified.filter(c=>c[k]).length]));
  const top=[...projects].sort((a,b)=>b.github_stars-a.github_stars||a.rank-b.rank).slice(0,6);
  const gems=[...projects]
    .filter(p=>!p.quality_flags?.includes('minimal_description'))
    .sort((a,b)=>hiddenGem(b)-hiddenGem(a)||a.rank-b.rank)
    .slice(0,5);

  return <div className="shell"><Nav/><main className="main">
    <div className="eyebrow">Build League intelligence</div>
    <h1 className="title">Explore what builders built.</h1>
    <p className="sub">BharatCode Atlas turns the {projects.length}-project Build League dataset into a research workspace for discovering ideas, technical signals and projects worth investigating.</p>

    <div className="heroactions">
      <Link className="button primary" href="/explore">Explore {projects.length} projects</Link>
      <Link className="button" href="/ai-researcher">Ask the AI researcher</Link>
    </div>

    <div className="stats">
      <div className="stat"><b>{projects.length}</b><span>Projects</span></div>
      <div className="stat"><b>{counts.agents}</b><span>Agent signals</span></div>
      <div className="stat"><b>{counts.rag}</b><span>RAG signals</span></div>
      <div className="stat"><b>{counts.security}</b><span>Security signals</span></div>
      <div className="stat"><b>{counts.devtools}</b><span>Dev-tool signals</span></div>
    </div>

    <div className="two">
      <section className="panel">
        <div className="sectionhead"><div><h2>Project landscape</h2><p>Atlas-derived keyword signals; not official classifications.</p></div></div>
        {categories.map(k=><div className="barrow" key={k}>
          <span>{SIGNALS[k].label}</span>
          <div className="bar"><div className="fill" style={{width:`${Math.max(4,counts[k]/Math.max(1,projects.length)*100)}%`}}/></div>
          <b>{counts[k]}</b>
        </div>)}
      </section>
      <section className="panel">
        <div className="sectionhead"><div><h2>Research paths</h2><p>Start with a question, not a leaderboard.</p></div></div>
        <div className="list">
          <Link href="/hidden-gems">Hidden gems <small>low visibility / strong signals →</small></Link>
          <Link href="/compare">Compare projects <small>side by side →</small></Link>
          <Link href="/ai-researcher">AI researcher <small>ask across Atlas →</small></Link>
        </div>
      </section>
    </div>

    <div className="section">
      <div className="sectionhead"><div><h2>Highest GitHub traction</h2><p>Source metrics from the live project page.</p></div><Link className="button" href="/explore">View all</Link></div>
      <div className="grid">{top.map(p=><ProjectCard key={p.id} p={p}/>)}</div>
    </div>

    <div className="section">
      <div className="sectionhead"><div><h2>Worth investigating</h2><p>Transparent heuristic hidden-gem signal, not a quality verdict.</p></div><Link className="button" href="/hidden-gems">See hidden gems</Link></div>
      <div className="grid">{gems.map(p=><ProjectCard key={p.id} p={p}/>)}</div>
    </div>

    <div className="footer">Source: BharatCode Build League project page · Atlas-derived signals are research aids.</div>
  </main></div>;
}
