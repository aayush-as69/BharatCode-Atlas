export type Project={id:string;rank:number;project_name:string;description:string;votes:number;github_stars:number;community_score:number;github_repo:string};

const SOURCE='https://bharatcode.ai/hackathon/projects';

export async function getProjects():Promise<Project[]>{
  const res=await fetch(SOURCE,{next:{revalidate:3600}});
  if(!res.ok) throw new Error('BharatCode project source unavailable');
  const html=await res.text();
  const cards=html.split('<article class="hackathon-project-card"').slice(1);
  return cards.map((raw,i)=>{
    const name=(raw.match(/<h3[^>]*>([\s\S]*?)<\/h3>/)?.[1]||'').replace(/<[^>]+>/g,'').trim();
    const description=(raw.match(/class="hackathon-project-description">[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/)?.[1]||'').replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&#x27;/g,"'").replace(/&quot;/g,'"').trim();
    const votes=Number(raw.match(/hackathon-project-vote-total[^>]*>[\s\S]*?<strong>(\d+)<\/strong>/)?.[1]||0);
    const rank=Number(raw.match(/title="Leaderboard rank">[\s\S]*?<dd>(\d+)/)?.[1]||i+1);
    const stars=Number(raw.match(/title="GitHub stars">[\s\S]*?<dd>(\d+)/)?.[1]||0);
    const score=Number(raw.match(/Community score:\s*([\d.]+)/)?.[1]||0);
    const repo=raw.match(/class="hackathon-project-repo" href="([^"]+)"/)?.[1]||'';
    return {id:`p${String(rank).padStart(3,'0')`,rank,project_name:name,description,votes,github_stars:stars,community_score:score,github_repo:repo};
  });
}
export function classify(p:Project){const t=(p.project_name+' '+p.description).toLowerCase();return {agents:/agent|autonomous|orchestrat/.test(t),rag:/\brag\b|retrieval|vector database|embedding/.test(t),security:/security|cyber|fraud|privacy|threat/.test(t),voice:/voice|speech|audio|stt|tts/.test(t),vision:/vision|ocr|image|video|computer vision/.test(t),governance:/governance|compliance|policy|audit/.test(t),civic:/civic|municipal|government|public service|urban/.test(t),devtools:/developer|codebase|github|repository|open-source|dev tool|software development/.test(t)}}
export function relevance(p:Project){return Math.min(100,20+Object.values(classify(p)).filter(Boolean).length*9+(p.github_stars>20?8:0)+(p.votes>20?5:0))}
export function hiddenGem(p:Project){return Math.min(100,Math.round(Math.min(35,p.github_stars*.8)+p.community_score*.35+Object.values(classify(p)).filter(Boolean).length*6+Math.max(0,20-p.votes)*1.2))}
