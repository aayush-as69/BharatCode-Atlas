import Nav from '@/components/Nav';
import ProjectCard from '@/components/ProjectCard';
import {getProjects} from '@/lib/source';

const profiles=[
  {name:'BrandGuard',desc:'Governance, security, compliance and AI decision support',terms:['governance','compliance','security','audit','policy','fraud','privacy']},
  {name:'Handover',desc:'Developer tooling, collaboration, repositories and knowledge transfer',terms:['developer','repository','codebase','github','open-source','documentation','collaboration']},
  {name:'VoiceOps',desc:'Voice agents, RAG, speech workflows and customer operations',terms:['voice','speech','audio','stt','tts','agent','rag','retrieval','embedding']},
  {name:'MaskChat',desc:'MERN, mentorship, matching, community and secure social workflows',terms:['mentor','mentorship','matching','community','security','privacy','chat','social']},
  {name:'CivicSync',desc:'Civic workflows, urban maintenance, government and public services',terms:['civic','municipal','government','public service','urban','maintenance','issue']}
];

function score(p,profile){
  const text=(p.project_name+' '+p.description).toLowerCase();
  const hits=profile.terms.filter(t=>text.includes(t)).length;
  return Math.min(100,Math.round(hits*14+(p.github_stars>10?4:0)+(p.votes>10?2:0)));
}

export default async function ForAayush(){
  const projects=await getProjects();
  return (
    <div className="shell">
      <Nav/>
      <main className="main">
        <div className="eyebrow">Personal research mode</div>
        <h1 className="title">For Aayush</h1>
        <p className="sub">A first-pass relevance layer for the projects you are actively building. Scores are transparent keyword signals from published descriptions, not claims about repository implementation.</p>

        <div className="section">
          {profiles.map(profile=>{
            const ranked=projects.map(p=>({p,s:score(p,profile)})).filter(x=>x.s>0).sort((a,b)=>b.s-a.s||b.p.github_stars-a.p.github_stars).slice(0,4);
            return (
              <section className="panel" style={{marginBottom:14}} key={profile.name}>
                <div className="sectionhead">
                  <div><h2>{profile.name}</h2><p>{profile.desc}</p></div>
                  <span className="chip">{ranked.length} matches</span>
                </div>
                <div className="grid">{ranked.map(({p,s})=><div key={p.id} style={{position:'relative'}}><ProjectCard p={p} compact/><div style={{position:'absolute',right:16,top:16,fontSize:10,color:'var(--accent2)'}}>{s}/100</div></div>)}</div>
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}