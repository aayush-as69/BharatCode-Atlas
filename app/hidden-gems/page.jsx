import Nav from '@/components/Nav';
import ProjectCard from '@/components/ProjectCard';
import {getProjects,hiddenGem,whyHiddenGem,technicalInterest} from '@/lib/source';

export const metadata={title:'Hidden gems'};

export default async function HiddenGems(){
  const projects=(await getProjects()).map(p=>({...p,gem:hiddenGem(p),interest:technicalInterest(p),why:whyHiddenGem(p)}))
    .sort((a,b)=>b.gem-a.gem||b.interest-a.interest);
  return <div className="shell"><Nav/><main id="main" className="main">
    <div className="eyebrow">Popularity ≠ research value</div>
    <h1 className="title">Hidden gems.</h1>
    <p className="sub">Projects where Atlas sees an interesting combination of low popularity and useful technical/problem-space signals. This is a heuristic shortlist, not a quality verdict.</p>
    <div className="grid section">
      {projects.slice(0,24).map(p=><div key={p.id} className="panel">
        <ProjectCard p={p} compact/>
        <div style={{padding:'0 16px 16px'}}>
          <div className="metrics"><b>{p.gem}<span> gem score</span></b><b>{p.interest}<span> technical interest</span></b></div>
          <p style={{fontSize:12,color:'var(--muted)',margin:'10px 0 0'}}>Why: {p.why}</p>
        </div>
      </div>)}
    </div>
  </main></div>;
}