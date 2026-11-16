import Link from 'next/link';
import Nav from '@/components/Nav';
import {getProjects,relevance,hiddenGem} from '@/lib/source';
import {findProject} from '@/lib/dataset';
import {inspectRepository} from '@/lib/github';
import CompareStudyButton from '@/components/CompareStudyButton';

export default async function Compare({searchParams}){
  const sp=await searchParams;
  const queryIds=String(sp?.projects||'').split(',').filter(Boolean);
  const selectedIds=[0,1,2,3].map(i=>String(sp?.['project'+i]||'')).filter(Boolean);
  const ids=[...new Set([...queryIds,...selectedIds])].slice(0,4);
  const all=await getProjects();
  const resolved=ids.map(id=>findProject(all,id)).filter(Boolean);
  const picks=[...new Map(resolved.map(p=>[p.id,p])).values()];
  const shown=picks.length?picks:all.slice(0,3);
  const picker=all.slice(0,40);
  const inspected=await Promise.all(shown.map(async p=>({...p,repo:await inspectRepository(p.github_repo)})));
  const failed=inspected.filter(p=>!p.repo.ok);

  const architectureKeys=['Frontend','Backend / API','Database','AI / LLM','RAG / Retrieval','Agents / Orchestration','Authentication','Deployment','Testing','Observability'];
  const technologyKeys=['Next.js','React','Python','FastAPI','Flask','Express','MongoDB','PostgreSQL','Supabase','Tailwind CSS','LangChain','LlamaIndex','OpenAI','Gemini','Vector DB','Docker','MCP'];

  return <div className="shell"><Nav/><main className="main">
    <div className="eyebrow">Architecture research</div>
    <h1 className="title">Compare projects.</h1>
    <p className="sub">Put 2–4 repositories side-by-side and compare their public source signals, architecture fingerprints, technologies, and engineering structure.</p>

    <form className="panel section" method="get">
      <p className="label" id="compare-choose">Choose projects</p>
      <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:8,marginTop:8}}>
        {[0,1,2,3].map(i=><select key={i} name={'project'+i} defaultValue={picks[i]?.id||''} className="input" aria-label={'Project '+(i+1)}>
          <option value="">Project {i+1} — optional</option>
          {all.map(p=><option value={p.id} key={p.id}>{'#'+p.rank+' · '+p.project_name}</option>)}
        </select>)}
      </div>
      <button className="button" type="submit" style={{marginTop:10}}>Compare selected projects</button>
      <div className="tags" style={{marginTop:10}}>
        {picker.slice(0,20).map(p=><Link className="chip" key={p.id} href={'/compare?projects='+encodeURIComponent([...new Set([...picks.map(x=>x.id),p.id])].slice(0,4).join(','))}>{p.project_name}</Link>)}
      </div>
    </form>

    {failed.length?<p className="notice section">Repository evidence is unavailable for {failed.map(p=>p.project_name).join(', ')}: {failed[0].repo.error} Source-data rows below are still shown.</p>:null}

    <section className="panel section">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,marginBottom:12}}>
        <div><h2>Research this comparison</h2><p className="prose">Save the selected implementations as a study task.</p></div>
        {inspected.length>=2&&<CompareStudyButton projects={inspected}/>}
      </div>
      <div style={{overflowX:'auto'}}>
        <table className="table">
          <thead><tr><th>Source signal</th>{inspected.map(p=><th key={p.id}><Link href={'/projects/'+encodeURIComponent(p.id)}>{p.project_name}</Link><div style={{fontSize:12,color:'var(--muted)',marginTop:4}}>#{p.rank}</div></th>)}</tr></thead>
          <tbody>
            {[
              ['Votes',p=>p.votes],['GitHub stars at source capture',p=>p.github_stars],['Community score',p=>p.community_score],['Atlas relevance',relevance],['Hidden gem',hiddenGem]
            ].map(([name,fn])=><tr key={name}><td>{name}</td>{inspected.map(p=><td key={p.id}>{fn(p)}</td>)}</tr>)}
          </tbody>
        </table>
      </div>
    </section>

    <section className="panel section">
      <div className="sectionhead"><div><h2>Architecture</h2><p>Repository-level structural signals. “—” means Atlas could not detect the signal.</p></div></div>
      <div style={{overflowX:'auto'}}>
        <table className="table">
          <thead><tr><th>Architecture layer</th>{inspected.map(p=><th key={p.id}>{p.project_name}</th>)}</tr></thead>
          <tbody>{architectureKeys.map(key=><tr key={key}><td>{key}</td>{inspected.map(p=><td key={p.id}>{p.repo.ok&&p.repo.architecture.includes(key)?<span className="check">✓</span>:<span className="miss">—</span>}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </section>

    <section className="panel section">
      <div className="sectionhead"><div><h2>Technology stack</h2><p>Detected from dependency manifests, repository file paths and README terms.</p></div></div>
      <div style={{overflowX:'auto'}}>
        <table className="table">
          <thead><tr><th>Technology</th>{inspected.map(p=><th key={p.id}>{p.project_name}</th>)}</tr></thead>
          <tbody>{technologyKeys.map(key=><tr key={key}><td>{key}</td>{inspected.map(p=><td key={p.id}>{p.repo.ok&&p.repo.technologies.includes(key)?<span className="check">✓</span>:<span className="miss">—</span>}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </section>

    <section className="panel section">
      <div className="sectionhead"><div><h2>Architecture fingerprints</h2><p>Concrete implementation layers detected from selected repository files and public metadata.</p></div></div>
      <div className="grid">{inspected.map(p=><div className="panel" key={p.id}>
        <h3>{p.project_name}</h3>
        {p.repo.ok&&p.repo.evidence?.architecture_fingerprint?.length
          ? <div className="list">{p.repo.evidence.architecture_fingerprint.map(x=><div key={x.layer}><b>{x.layer}</b><small>{x.signal} · {x.evidence.join(' · ')}</small></div>)}</div>
          : <p className="prose">No architecture fingerprint signals were detected.</p>}
      </div>)}</div>
    </section>

    <section className="panel section">
      <div className="sectionhead"><div><h2>Architecture diff</h2><p>Layers detected in one selected repository but not another.</p></div></div>
      <div className="grid">{inspected.map(p=>{
        const mine=new Set((p.repo.ok?p.repo.architecture:[])||[]);
        const others=new Set(inspected.filter(x=>x.id!==p.id).flatMap(x=>x.repo.ok?x.repo.architecture:[]));
        const unique=[...mine].filter(x=>!others.has(x));
        return <div className="panel" key={p.id}><h3>{p.project_name}</h3>
          {unique.length?<div className="tags">{unique.map(x=><span className="tag" key={x}>{x}</span>)}</div>:<p className="prose">No architecture layer is unique within this comparison set.</p>}
        </div>;
      })}</div>
    </section>

    <section className="panel section">
      <h2>Evidence behind the comparison</h2>
      <p className="prose">Signals below come from dependency manifests, public repository paths and README terms. They are evidence indicators, not a full source-code audit.</p>
      <div className="grid">{inspected.map(p=><div className="panel" key={p.id}>
        <h3>{p.project_name}</h3>
        {p.repo.ok ? <div className="list">
          {Object.entries(p.repo.evidence?.architecture||{}).slice(0,8).map(([name,hits])=><div key={name}><b>{name}</b><small>{hits.join(' · ')}</small></div>)}
        </div> : <p className="prose">{p.repo.error}</p>}
      </div>)}</div>
    </section>

    <section className="panel section">
      <h2>How they differ</h2>
      <div className="list">{inspected.map(p=><div key={p.id}><b>{p.project_name}</b><small>{p.repo.ok?(p.repo.architecture.join(' · ')||'No architecture signals'):'Repository inspection unavailable'}</small></div>)}</div>
    </section>
  </main></div>;
}