import Link from 'next/link';
import {classify,relevance,hiddenGem} from '@/lib/source';

export default function ProjectCard({p,compact=false}){
  const signals=Object.entries(classify(p)).filter(([,v])=>v).map(([k])=>k);
  return (
    <article className="card">
      <div className="rank">#{p.rank} <span style={{float:'right'}}>Gem {hiddenGem(p)}</span></div>
      <Link href={'/projects/'+p.id}>
        <div className="name">{p.project_name}</div>
      </Link>
      <div className="desc">{p.description}</div>
      <div className="metrics">
        <b>{p.votes}<span> votes</span></b>
        <b>{p.github_stars}<span> stars</span></b>
        <b>{p.community_score.toFixed(1)}<span> score</span></b>
      </div>
      <div className="tags">
        {signals.slice(0,4).map(t=><span className="tag" key={t}>{t}</span>)}
        <span className="tag">Relevance {relevance(p)}</span>
      </div>
      {!compact && (
        <div style={{display:'flex',gap:7,marginTop:14}}>
          <Link className="button" style={{fontSize:11,padding:'8px 10px'}} href={'/projects/'+p.id}>View project</Link>
          <a className="button" style={{fontSize:11,padding:'8px 10px'}} href={p.github_repo} target="_blank" rel="noreferrer">GitHub ↗</a>
        </div>
      )}
    </article>
  );
}