import Nav from '@/components/Nav';
import Link from 'next/link';
import {getProjects} from '@/lib/source';
import {inspectRepository} from '@/lib/github';

export default async function ProjectPage({params}){
  const {id}=await params;
  const projects=await getProjects();
  const p=projects.find(x=>x.id===id);
  if(!p) return null;
  let repo=null;
  try{repo=await inspectRepository(p.github_repo);}catch(e){repo={ok:false,error:'Repository inspection unavailable'};}

  return <div className="shell"><Nav/><main className="main detail">
    <Link className="back" href="/explore">← Back to explorer</Link>
    <div className="detailhead" style={{marginTop:16}}>
      <div><div className="eyebrow">Project #{p.rank}</div><h1>{p.project_name}</h1><p className="prose">{p.description}</p></div>
      <a className="button" href={p.github_repo} target="_blank" rel="noreferrer">Open GitHub ↗</a>
    </div>
    <div className="kpis">
      <div className="kpi"><b>{p.votes}</b><span>Votes</span></div>
      <div className="kpi"><b>{p.github_stars}</b><span>GitHub stars</span></div>
      <div className="kpi"><b>{p.community_score.toFixed(1)}</b><span>Community score</span></div>
      {repo?.ok?<div className="kpi"><b>{repo.repository.language||'—'}</b><span>GitHub primary language</span></div>:<div className="kpi"><b>—</b><span>Repository data</span></div>}
    </div>
    <div className="two section">
      <section className="panel">
        <div className="sectionhead"><div><h2>Repository intelligence</h2><p>Evidence-backed signals from GitHub metadata, file paths and README.</p></div></div>
        {repo?.ok ? <>
          <div className="metrics"><b>{repo.repository.stars}<span> stars now</span></b><b>{repo.repository.forks}<span> forks</span></b><b>{repo.files.count}<span> tracked files</span></b></div>
          <div className="tags" style={{marginTop:12}}>{repo.technologies.map(x=><span className="tag" key={x}>{x}</span>)}</div>
          <p className="prose" style={{marginTop:14}}>Evidence: {repo.files.readme_found?'README + repository file paths':'repository file paths'}.</p>
        </> : <p className="prose">{repo?.error||'Repository inspection unavailable.'}</p>}
      </section>
      <section className="panel">
        <h2>Architecture clues</h2>
        <p className="prose">Atlas distinguishes published project metadata from repository evidence. Technology labels shown here are detected from repository evidence; they are not inferred solely from the project description.</p>
        {repo?.ok&&repo.files.manifests.length?<div className="list">{repo.files.manifests.slice(0,8).map(x=><div key={x}><b>{x}</b><small>manifest detected</small></div>)}</div>:null}
      </section>
    </div>
  </main></div>;
}