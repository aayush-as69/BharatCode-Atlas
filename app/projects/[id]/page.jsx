import Nav from '@/components/Nav';
import Link from 'next/link';
import {getProjects} from '@/lib/source';
import {inspectRepository} from '@/lib/github';
import StudyButton from '@/components/StudyButton';

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
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
        <StudyButton project={p} repositoryIntelligence={repo}/>
        <Link className="button" href={'/compare?projects='+encodeURIComponent(p.id)}>Compare this →</Link>
        <a className="button" href={p.github_repo} target="_blank" rel="noreferrer">Open GitHub ↗</a>
      </div>
    </div>

    <div className="kpis">
      <div className="kpi"><b>{p.votes}</b><span>Votes</span></div>
      <div className="kpi"><b>{p.github_stars}</b><span>GitHub stars at source capture</span></div>
      <div className="kpi"><b>{p.community_score.toFixed(1)}</b><span>Community score</span></div>
      {repo?.ok?<div className="kpi"><b>{repo.repository.language||'—'}</b><span>GitHub primary language</span></div>:null}
    </div>

    <div className="two section">
      <section className="panel">
        <div className="sectionhead"><div><h2>Repository intelligence</h2><p>Current public GitHub evidence.</p></div></div>
        {repo?.ok ? <>
          <div className="metrics"><b>{repo.repository.stars}<span> current stars</span></b><b>{repo.repository.forks}<span> forks</span></b><b>{repo.repository.open_issues}<span> open issues</span></b></div>
          <p style={{fontSize:10,color:'var(--muted)',marginTop:10}}>Live GitHub inspection · repository updated {repo.repository.updated_at?new Date(repo.repository.updated_at).toLocaleDateString():'unknown'}</p>
          <h3 style={{marginTop:18}}>Technologies</h3>
          <div className="tags">{repo.technologies.map(x=><span className="tag" key={x}>{x}</span>)}</div>
          <h3 style={{marginTop:18}}>Architecture</h3>
          <div className="tags">{repo.architecture.map(x=><span className="tag" key={x}>{x}</span>)}</div>
          {repo.evidence?.architecture_fingerprint?.length?<><h3 style={{marginTop:18}}>Architecture fingerprint</h3>
            <div className="list">{repo.evidence.architecture_fingerprint.map((x,i)=><div key={x.layer+'-'+i}><b>{x.layer}</b><small>{x.signal} · {x.evidence.join(' · ')}</small></div>)}</div>
          </>:null}
          {repo.evidence?.architecture_hypothesis?.length?<><h3 style={{marginTop:18}}>Architecture hypothesis</h3>
            <div className="list">{repo.evidence.architecture_hypothesis.map((x,i)=><div key={x}><b>{i+1}. {x}</b><small>Detected repository layer</small></div>)}</div>
          </>:null}
        </> : <p className="prose">{repo?.error}</p>}
      </section>

      <section className="panel">
        <h2>Evidence</h2>
        <p className="prose">Atlas generated these signals from public repository file paths and README content. They are indicators for research, not a full source-code audit.</p>
        {repo?.ok&&<><div className="list">
          <div><b>Repository</b><small>{repo.repository.full_name}</small></div>
          <div><b>Default branch</b><small>{repo.repository.default_branch}</small></div>
          <div><b>README</b><small>{repo.files.readme_found?'Found':'Not found'}</small></div>
          <div><b>Files sampled</b><small>{repo.files.count}</small></div>
        </div>
        <h3 style={{marginTop:18}}>Detected manifests</h3>
        <div className="list">{repo.files.manifests.slice(0,10).map(x=><div key={x}><b>{x}</b><small>repository file</small></div>)}</div>
        {repo.evidence?.source_files?.length?<><h3 style={{marginTop:18}}>Inspected repository files</h3>
        <div className="list">{repo.evidence.source_files.map(x=><div key={x.path}><b>{x.path}</b><small>{x.role+' · '+x.size+' bytes'}</small><details style={{marginTop:6}}><summary style={{fontSize:10,color:'var(--muted)',cursor:'pointer'}}>Show preview</summary><pre style={{fontSize:9,whiteSpace:'pre-wrap',maxHeight:180,overflow:'auto',marginTop:6}}>{x.preview}</pre></details></div>)}</div>
        </>:null}
        <h3 style={{marginTop:18}}>Why Atlas detected these</h3>
        <div className="list">{Object.entries(repo.evidence?.technologies||{}).slice(0,10).map(([name,hits])=><div key={name}><b>{name}</b><small>{hits.join(' · ')}</small></div>)}</div>
        </>}
      </section>
    </div>

    <section className="panel section">
      <h2>Source description</h2>
      <p className="prose">{p.description}</p>
      <a href={p.github_repo} target="_blank" rel="noreferrer" style={{color:'var(--accent)'}}>Inspect the source repository ↗</a>
    </section>
  </main></div>;
}