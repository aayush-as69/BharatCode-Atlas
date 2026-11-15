import Nav from '@/components/Nav';
import Link from 'next/link';
import {notFound,redirect} from 'next/navigation';
import {findProject} from '@/lib/source';
import {inspectRepository} from '@/lib/github';
import {compactIntelligence} from '@/lib/research-storage';
import StudyButton from '@/components/StudyButton';

const FLAG_NOTES={
  duplicate_repo:'This repository is submitted by more than one BharatCode project entry.',
  minimal_description:'The submitted description is very short, so description-based signals are weak.'
};

export default async function ProjectPage({params}){
  const {id}=await params;
  const p=await findProject(decodeURIComponent(id));
  if(!p) notFound();
  // Old rank-based links (/projects/p012) keep working and redirect to the stable id.
  if(p.id!==id) redirect('/projects/'+encodeURIComponent(p.id));
  const repo=await inspectRepository(p.github_repo);

  return <div className="shell"><Nav/><main className="main detail">
    <Link className="back" href="/explore">← Back to explorer</Link>
    <div className="detailhead" style={{marginTop:16}}>
      <div><div className="eyebrow">Project #{p.rank}</div><h1>{p.project_name}</h1><p className="prose">{p.description}</p></div>
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
        <StudyButton project={p} repositoryIntelligence={compactIntelligence(repo)}/>
        <Link className="button" href={'/compare?projects='+encodeURIComponent(p.id)}>Compare this →</Link>
        <a className="button" href={p.github_repo} target="_blank" rel="noreferrer">Open GitHub ↗</a>
      </div>
    </div>

    {p.quality_flags?.length?<p className="notice" style={{marginTop:14}}>{p.quality_flags.map(f=>FLAG_NOTES[f]).filter(Boolean).join(' ')}</p>:null}

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
          <p style={{fontSize:11,color:'var(--muted)',marginTop:10}}>Live GitHub inspection · repository updated {repo.repository.updated_at?new Date(repo.repository.updated_at).toLocaleDateString():'unknown'}</p>
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
        </> : <p className="prose">{repo?.error||'Repository inspection unavailable.'}</p>}
      </section>

      <section className="panel">
        <h2>Evidence</h2>
        <p className="prose">Atlas generated these signals from dependency manifests, public repository file paths and README terms. They are indicators for research, not a full source-code audit. Atlas never displays source files other than manifests and deployment/CI configuration, and masks anything that looks like a credential.</p>
        {repo?.ok&&<><div className="list">
          <div><b>Repository</b><small>{repo.repository.full_name}</small></div>
          <div><b>Default branch</b><small>{repo.repository.default_branch}</small></div>
          <div><b>README</b><small>{repo.files.readme_found?'Found':'Not found'}</small></div>
          <div><b>Files sampled</b><small>{repo.files.count}</small></div>
        </div>
        {repo.files.truncated?<p className="notice" style={{marginTop:12}}>This repository is large; Atlas only sampled the first {repo.files.count} files.</p>:null}
        <h3 style={{marginTop:18}}>Detected manifests</h3>
        <div className="list">{repo.files.manifests.slice(0,10).map(x=><div key={x}><b>{x}</b><small>repository file</small></div>)}</div>
        {repo.evidence?.source_files?.length?<><h3 style={{marginTop:18}}>Inspected repository files</h3>
        <div className="list">{repo.evidence.source_files.map(x=><div key={x.path}><b>{x.path}</b><small>{x.role+(x.size!=null?' · '+x.size+' bytes':'')}</small>{x.preview?<details style={{marginTop:6}}><summary style={{fontSize:11,color:'var(--muted)',cursor:'pointer'}}>Show preview (secrets masked)</summary><pre style={{fontSize:11,whiteSpace:'pre-wrap',maxHeight:180,overflow:'auto',marginTop:6}}>{x.preview}</pre></details>:null}</div>)}</div>
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