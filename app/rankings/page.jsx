import Nav from '@/components/Nav';
import Link from 'next/link';
import {getProjects,architectureProfile,researchScore,hiddenGem} from '@/lib/source';

const categories=[
  ['RAG / Retrieval','rag'],
  ['AI Agents','agents'],
  ['Security','security'],
  ['Developer Tools','developerTools'],
  ['Voice / Audio','voice'],
  ['Vision / OCR','vision'],
  ['Governance / Compliance','governance'],
  ['Civic / Public','civic'],
  ['AI / LLM','ai'],
  ['Architecture','architecture']
];

export default async function Rankings(){
  const projects=await getProjects();
  const rows=projects.map(p=>({...p,profile:architectureProfile(p),research:researchScore(p),gem:hiddenGem(p)}));
  const scoreFor=(row,key)=>key==='architecture'
    ? ['frontend','backend','database','deployment','testing'].filter(k=>row.profile.dimensions[k]).length*15
    : row.profile.dimensions[key]?row.research:0;

  return <div className="shell"><Nav/><main className="main">
    <div className="eyebrow">Research rankings</div>
    <h1 className="title">What should you investigate?</h1>
    <p className="sub">Rankings are Atlas research signals, not official competition awards. They combine published project signals with repository evidence when available.</p>

    <section className="section">
      {categories.map(([label,key])=>{
        const ranked=rows.filter(x=>scoreFor(x,key)>0).sort((a,b)=>scoreFor(b,key)-scoreFor(a,key)).slice(0,8);
        return <div className="panel" key={key} style={{marginBottom:12}}>
          <div className="sectionhead"><div><h2>{label}</h2><p>{ranked.length+' projects currently show this signal.'}</p></div></div>
          <div className="list">{ranked.map((x,i)=><Link href={'/projects/'+x.id} key={x.id}>
            <b>{'#'+(i+1)+' · #'+x.rank+' '+x.project_name}</b>
            <small>{'Research signal '+scoreFor(x,key)+' · '+x.github_stars+' GitHub stars · '+x.votes+' votes'}</small>
          </Link>)}</div>
        </div>;
      })}
    </section>

    <section className="panel section">
      <div className="sectionhead"><div><h2>Overall research interest</h2><p>Technical + engineering signals with community and GitHub context.</p></div></div>
      <div className="list">{rows.sort((a,b)=>b.research-a.research).slice(0,15).map(x=><Link href={'/projects/'+x.id} key={x.id}>
        <b>{'#'+x.rank+' '+x.project_name}</b><small>{'Research score '+x.research+' · Hidden gem '+x.gem}</small>
      </Link>)}</div>
    </section>
  </main></div>