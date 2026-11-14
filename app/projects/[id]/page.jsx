import Link from 'next/link';
import Nav from '@/components/Nav';
import ProjectCard from '@/components/ProjectCard';
import {getProjects,classify,relevance,hiddenGem,signalDetails} from '@/lib/source';
import {notFound} from 'next/navigation';

export default async function ProjectPage({params}){
  const {id}=await params;
  const projects=await getProjects();
  const p=projects.find(x=>x.id===id);
  if(!p) return notFound();

  const signals=signalDetails(p);
  const related=projects
    .filter(x=>x.id!==p.id)
    .map(x=>({p:x,overlap:Object.keys(classify(x)).filter(k=>classify(p)[k]&&classify(x)[k]).length}))
    .filter(x=>x.overlap>0)
    .sort((a,b)=>b.overlap-a.overlap || b.p.github_stars-a.p.github_stars)
    .slice(0,3);

  return (
    <div className="shell">
      <Nav/>
      <main className="main detail">
        <Link className="back" href="/explore">← Back to explorer</Link>

        <div className="detailhead" style={{marginTop:16}}>
          <div>
            <div className="eyebrow">Project #{p.rank}</div>
            <h1>{p.project_name}</h1>
            <p className="prose">{p.description}</p>
          </div>
          <a className="button" href={p.github_repo} target="_blank" rel="noreferrer">Open GitHub ↗</a>
        </div>

        <div className="kpis">
          <div className="kpi"><b>{p.votes}</b><span>Votes</span></div>
          <div className="kpi"><b>{p.github_stars}</b><span>GitHub stars</span></div>
          <div className="kpi"><b>{p.community_score.toFixed(1)}</b><span>Community score</span></div>
          <div className="kpi"><b>{relevance(p)}</b><span>Atlas relevance</span></div>
        </div>

        <div className="two">
          <section className="panel">
            <div className="sectionhead">
              <div><h2>Atlas research signals</h2><p>Derived from project name + published description.</p></div>
              <span className="chip">Gem {hiddenGem(p)}</span>
            </div>
            {signals.length ? (
              <div className="list">
                {signals.map(s=><div key={s.key} style={{padding:'9px 0',borderBottom:'1px solid #1b232e'}}>
                  <b style={{fontSize:12}}>{s.label}</b>
                  <div style={{fontSize:10,color:'var(--muted)',marginTop:3}}>{s.reason}</div>
                </div>)}
              </div>
            ) : <p className="prose">No current keyword signal matched this project's published text.</p>}
          </section>

          <section className="panel">
            <h2>Why investigate?</h2>
            <p className="prose">This project is worth opening when its published problem statement overlaps with your research interests. The current recommendation is description-based; repository architecture has not yet been verified by Atlas.</p>
            <div className="tags">
              {signals.map(s=><span className="tag" key={s.key}>{s.label}</span>)}
            </div>
          </section>
        </div>

        <section className="panel section">
          <div className="sectionhead">
            <div><h2>Source facts</h2><p>Published metadata · preserved separately from Atlas analysis.</p></div>
          </div>
          <div className="metrics" style={{marginTop:0}}>
            <b>Rank <span>#{p.rank}</span></b>
            <b>Votes <span>{p.votes}</span></b>
            <b>Stars <span>{p.github_stars}</span></b>
            <b>Community <span>{p.community_score.toFixed(1)}</span></b>
          </div>
          <p className="prose">Repository: <a href={p.github_repo} target="_blank" rel="noreferrer" style={{color:'var(--accent)'}}>{p.github_repo}</a></p>
        </section>

        <section className="section">
          <div className="sectionhead">
            <div><h2>Related projects</h2><p>Shared Atlas signals, not semantic similarity.</p></div>
          </div>
          <div className="grid">{related.map(({p})=><ProjectCard key={p.id} p={p} compact/>)}</div>
        </section>
      </main>
    </div>
  );
}