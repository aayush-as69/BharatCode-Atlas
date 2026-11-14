import Nav from '@/components/Nav';
import ProjectCard from '@/components/ProjectCard';
import {getProjects,personalOpportunity,PERSONAL_PROFILES} from '@/lib/source';

export default async function ForAayush(){
  const projects=await getProjects();
  const profiles=Object.entries(PERSONAL_PROFILES);

  return <div className="shell"><Nav/><main className="main">
    <div className="eyebrow">Personal research mode</div>
    <h1 className="title">For Aayush</h1>
    <p className="sub">A project is surfaced here because its published description matches one of your research profiles. Scores are transparent discovery signals, not quality judgments.</p>

    <div className="section">
      {profiles.map(([name,profile])=>{
        const ranked=projects.map(p=>({p,opportunity:personalOpportunity(p,name)}))
          .filter(x=>x.opportunity.score>0)
          .sort((a,b)=>b.opportunity.score-a.opportunity.score||b.p.github_stars-a.p.github_stars)
          .slice(0,6);

        return <section className="panel" style={{marginBottom:14}} key={name}>
          <div className="sectionhead">
            <div><h2>{name}</h2><p>{'Signals relevant to '+name+' from the published BharatCode project descriptions.'}</p></div>
            <span className="chip">{ranked.length+' top opportunities'}</span>
          </div>
          <div className="grid">{ranked.map(({p,opportunity})=><div key={p.id} className="panel" style={{padding:0,overflow:'hidden'}}>
            <ProjectCard p={p} compact/>
            <div style={{padding:'0 16px 16px'}}>
              <div className="metrics"><b>{opportunity.score}<span> opportunity</span></b></div>
              <p style={{fontSize:10,color:'var(--muted)',marginTop:8}}>{opportunity.reasons.join(' · ')}</p>
            </div>
          </div>)}</div>
        </section>;
      })}
    </div>
  </main></div>;
}