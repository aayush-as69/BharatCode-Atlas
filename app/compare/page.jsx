import Link from 'next/link';
import Nav from '@/components/Nav';
import {getProjects,classify,relevance,hiddenGem} from '@/lib/source';

export default async function Compare({searchParams}){
  const sp=await searchParams;
  const ids=String(sp?.projects||'').split(',').filter(Boolean).slice(0,4);
  const all=await getProjects();
  const picks=ids.length?ids.map(id=>all.find(p=>p.id===id)).filter(Boolean):all.slice(0,3);
  const picker=all.slice(0,40);

  return <div className="shell"><Nav/><main className="main">
    <div className="eyebrow">Side-by-side research</div>
    <h1 className="title">Compare projects.</h1>
    <p className="sub">Select up to four projects. Comparison uses source metrics plus Atlas-derived signals.</p>

    <form className="panel section" method="get">
      <label style={{fontSize:11,color:'var(--muted)'}}>Project IDs — comma separated</label>
      <div style={{display:'flex',gap:8,marginTop:8}}>
        <input name="projects" defaultValue={ids.join(',')} placeholder="p001,p042,p294" style={{flex:1}}/>
        <button className="button" type="submit">Compare</button>
      </div>
      <div className="tags" style={{marginTop:10}}>
        {picker.slice(0,20).map(p=><Link className="chip" key={p.id} href={'/compare?projects='+encodeURIComponent([...new Set([...ids,p.id])].slice(0,4).join(','))}>{p.project_name}</Link>)}
      </div>
    </form>

    <div className="panel section">
      <div style={{overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
          <thead><tr><th style={{textAlign:'left',padding:12}}>Signal</th>{picks.map(p=><th key={p.id} style={{textAlign:'left',padding:12,minWidth:180}}><Link href={'/projects/'+p.id}>{p.project_name}</Link><div style={{fontSize:10,color:'var(--muted)',marginTop:4}}>#{p.rank}</div></th>)}</tr></thead>
          <tbody>
            {[
              ['Votes',p=>p.votes],['GitHub stars',p=>p.github_stars],['Community score',p=>p.community_score],['Atlas relevance',relevance],['Hidden gem',hiddenGem]
            ].map(([name,fn])=><tr key={name}><td style={{padding:12,color:'var(--muted)',borderTop:'1px solid var(--line)'}}>{name}</td>{picks.map(p=><td key={p.id} style={{padding:12,borderTop:'1px solid var(--line)'}}>{fn(p)}</td>)}</tr>)}
            <tr><td style={{padding:12,color:'var(--muted)',borderTop:'1px solid var(--line)'}}>Signals</td>{picks.map(p=><td key={p.id} style={{padding:12,borderTop:'1px solid var(--line)'}}><div className="tags">{Object.entries(classify(p)).filter(([,v])=>v).map(([k])=><span className="tag" key={k}>{k}</span>)}</div></td>)}</tr>
          </tbody>
        </table>
      </div>
    </div>
  </main></div>;
}