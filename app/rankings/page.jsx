import Nav from '@/components/Nav';
import Link from 'next/link';
import {getProjects,architectureProfile,researchScore,hiddenGem} from '@/lib/source';

export const metadata={title:'Research rankings'};

// Rankings use only the published project text and numbers. Repository-level
// engineering signals (frontend, database, testing, ...) need a GitHub
// inspection per repo, so they are shown on project and Compare pages instead.
const categories=[['RAG / Retrieval','rag'],['AI Agents','agents'],['Security','security'],['Developer Tools','developerTools'],['Voice / Audio','voice'],['Vision / OCR','vision'],['Governance / Compliance','governance'],['Civic / Public','civic'],['AI / LLM','ai']];

export default async function Rankings(){
  const projects=await getProjects();
  const rows=projects.map(p=>({...p,profile:architectureProfile(p),research:researchScore(p),gem:hiddenGem(p)}));
  const scoreFor=(row,key)=>row.profile.dimensions[key]?row.research:0;
  const overall=[...rows].sort((a,b)=>b.research-a.research||a.rank-b.rank).slice(0,15);
  return <div className="shell"><Nav/><main id="main" className="main">
    <div className="eyebrow">Research rankings</div>
    <h1 className="title">What should you investigate?</h1>
    <p className="sub">Rankings are Atlas research signals, not official competition awards. They combine each project's published description, votes, stars and community score. Repository-level evidence is available on individual project pages and in Compare.</p>
    <section className="section">
      {categories.map(([label,key])=>{
        const all=rows.filter(x=>scoreFor(x,key)>0);
        const ranked=[...all].sort((a,b)=>scoreFor(b,key)-scoreFor(a,key)||a.rank-b.rank).slice(0,8);
        return <div className="panel" key={key} style={{marginBottom:12}}>
          <div className="sectionhead"><div><h2>{label}</h2><p>{all.length+' projects show this signal in their description; top '+ranked.length+' shown.'}</p></div></div>
          <div className="list">{ranked.map((x,i)=><Link href={'/projects/'+encodeURIComponent(x.id)} key={x.id}><b>{'#'+(i+1)+' · #'+x.rank+' '+x.project_name}</b><small>{'Research signal '+scoreFor(x,key)+' · '+x.github_stars+' GitHub stars · '+x.votes+' votes'}</small></Link>)}</div>
        </div>;
      })}
    </section>
    <section className="panel section">
      <div className="sectionhead"><div><h2>Overall research interest</h2><p>Technical signals with community and GitHub context.</p></div></div>
      <div className="list">{overall.map(x=><Link href={'/projects/'+encodeURIComponent(x.id)} key={x.id}><b>{'#'+x.rank+' '+x.project_name}</b><small>{'Research score '+x.research+' · Hidden gem '+x.gem}</small></Link>)}</div>
    </section>
  </main></div>;
}
