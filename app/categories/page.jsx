import Link from 'next/link';
import Nav from '@/components/Nav';
import ProjectCard from '@/components/ProjectCard';
import {getProjects,classify} from '@/lib/source';

const categories=[
  ['agents','AI Agents','Agents, autonomous workflows and orchestration'],
  ['rag','RAG / Retrieval','Retrieval, embeddings and vector-search signals'],
  ['security','Security','Security, cyber, fraud, privacy and threat signals'],
  ['voice','Voice / Audio','Voice, speech, audio, STT and TTS signals'],
  ['vision','Vision / OCR','Vision, OCR, image and video signals'],
  ['governance','Governance / Compliance','Governance, policy, audit and compliance signals'],
  ['civic','Civic / Public','Civic, government, public-service and urban signals'],
  ['devtools','Developer Tools','Developer workflows, repositories and software tooling']
];

export default async function Categories(){
  const projects=await getProjects();
  const groups=categories.map(([key,label,description])=>({
    key,label,description,
    projects:projects.filter(p=>classify(p)[key])
  }));
  return (
    <div className="shell">
      <Nav/>
      <main className="main">
        <div className="eyebrow">Research taxonomy</div>
        <h1 className="title">Categories</h1>
        <p className="sub">Atlas-derived signals help you move from {projects.length} projects to a smaller research surface. A project can belong to multiple categories.</p>
        <div className="section">
          {groups.map(g=>(
            <section className="panel" style={{marginBottom:14}} key={g.key}>
              <div className="sectionhead">
                <div>
                  <h2>{g.label} <span style={{color:'var(--muted)',fontWeight:400}}>· {g.projects.length}</span></h2>
                  <p>{g.description}</p>
                </div>
                <Link className="button" href={'/explore?tag='+g.key}>Explore category →</Link>
              </div>
              <div className="grid">
                {g.projects.slice(0,3).map(p=><ProjectCard key={p.id} p={p} compact/>)}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}