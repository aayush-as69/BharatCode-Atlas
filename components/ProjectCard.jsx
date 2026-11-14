import Link from 'next/link';
import {classify,relevance,hiddenGem} from '@/lib/source';

export default function ProjectCard({p,compact=false}){
  const signals=Object.entries(classify(p)).filter(([,v])=>v).map(([k])=>k);
  const gem=hiddenGem(p);
  return (
    <article className="card">
      <div className="cardhead">
        <span className="rank">#{p.rank}</span>
        {gem>0&&<span className="gem">✦ Gem {gem}</span>}
      </div>
      <Link href={'/projects/'+p.id} className="name">{p.project_name}</Link>
      <p className="desc">{p.description}</p>
      <div className="metrics">
        <b>{p.votes}<span>votes</span></b>
        <b>{p.github_stars}<span>stars</span></b>
        <b>{p.community_score.toFixed(1)}<span>score</span></b>
      </div>
      <div className="tags">
        {signals.slice(0,3).map(t=><span className="tag" key={t}>{t}</span>)}
        <span className="tag">Relevance {relevance(p)}</span>
      </div>
      {!compact&&(
        <div className="actions">
          <Link className="button small" href={'/projects/'+p.id}>View project</Link>
          <a className="button small ghost" href={p.github_repo} target="_blank" rel="noreferrer">GitHub ↗</a>
        </div>
      )}
    </article>
  );
}
