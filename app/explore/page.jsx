import Nav from '@/components/Nav';
import ProjectCard from '@/components/ProjectCard';
import {getProjects,classify,relevance,hiddenGem} from '@/lib/source';

const tags=['all','agents','rag','security','voice','vision','governance','civic','devtools'];
const tagLabels={all:'All',agents:'AI Agents',rag:'RAG',security:'Security',voice:'Voice',vision:'Vision / OCR',governance:'Governance',civic:'Civic',devtools:'Developer Tools'};

export default async function Explore({searchParams}){
  const sp=await searchParams;
  const q=String(sp?.q||'').trim().toLowerCase();
  const tag=tags.includes(sp?.tag)?sp.tag:'all';
  const sort=sp?.sort||'rank';
  const projects=await getProjects();

  const shown=projects.filter(p=>{
    const t=(p.project_name+' '+p.description+' '+p.github_repo).toLowerCase();
    if(q&&!t.includes(q)) return false;
    if(tag!=='all'&&!classify(p)[tag]) return false;
    return true;
  });

  const sorted=[...shown].sort((a,b)=>{
    if(sort==='stars') return b.github_stars-a.github_stars;
    if(sort==='votes') return b.votes-a.votes;
    if(sort==='score') return b.community_score-a.community_score;
    if(sort==='relevance') return relevance(b)-relevance(a);
    if(sort==='gem') return hiddenGem(b)-hiddenGem(a);
    if(sort==='name') return a.project_name.localeCompare(b.project_name);
    return a.rank-b.rank;
  });

  const makeUrl=(nextTag=tag,nextSort=sort)=>'/explore?tag='+nextTag+'&sort='+nextSort+(q?'&q='+encodeURIComponent(q):'');

  return (
    <div className="shell">
      <Nav/>
      <main className="main">
        <div className="eyebrow">Project explorer</div>
        <h1 className="title">{projects.length} projects, one research surface.</h1>
        <p className="sub">Search the published project metadata. Category chips and relevance scores are Atlas-derived research signals, not official BharatCode classifications.</p>

        <form className="search">
          <input name="q" defaultValue={sp?.q||''} placeholder="Search name, description or repository…" aria-label="Search projects"/>
          <button className="button" type="submit">Search</button>
        </form>

        <div className="filters">
          {tags.map(t=><a key={t} className={'chip '+(tag===t?'on':'')} href={makeUrl(t,sort)}>{tagLabels[t]}</a>)}
        </div>

        <div className="sectionhead section" style={{marginTop:20}}>
          <div>
            <h2>{shown.length} result{shown.length===1?'':'s'}</h2>
            <p>{q?'Search: “'+q+'” · ':''}{tag==='all'?'All signals':'Signal: '+tagLabels[tag]}</p>
          </div>
          <div className="filters">
            {[
              ['rank','Rank'],
              ['relevance','Relevance'],
              ['gem','Hidden gem'],
              ['stars','Stars'],
              ['votes','Votes'],
              ['score','Community'],
              ['name','Name']
            ].map(([value,label])=><a key={value} className={'chip '+(sort===value?'on':'')} href={makeUrl(tag,value)}>{label}</a>)}
          </div>
        </div>

        {sorted.length ? (
          <div className="grid">{sorted.map(p=><ProjectCard key={p.id} p={p}/>)}</div>
        ) : (
          <div className="panel section">
            <h2>No projects matched</h2>
            <p className="prose">Try a broader search or remove the category filter.</p>
            <a className="button" href="/explore">Reset explorer</a>
          </div>
        )}
      </main>
    </div>
  );
}