import Nav from '@/components/Nav';
import ProjectCard from '@/components/ProjectCard';
import {getProjects,classify,relevance,hiddenGem} from '@/lib/source';

export const metadata={title:'Explore'};

const tags=['all','agents','rag','security','voice','vision','governance','civic','devtools'];
const tagLabels={all:'All',agents:'AI Agents',rag:'RAG',security:'Security',voice:'Voice',vision:'Vision / OCR',governance:'Governance',civic:'Civic',devtools:'Developer Tools'};

const SORTS=[['rank','Rank'],['relevance','Relevance'],['gem','Hidden gem'],['stars','Stars'],['votes','Votes'],['score','Community'],['name','Name']];
const SORT_KEYS=SORTS.map(([key])=>key);
const PAGE_SIZE=60;

export default async function Explore({searchParams}){
  const sp=await searchParams;
  const rawQ=String(sp?.q||'').trim().slice(0,200);
  const q=rawQ.toLowerCase();
  const words=q.split(/\s+/).filter(Boolean);
  const tag=tags.includes(sp?.tag)?sp.tag:'all';
  const sort=SORT_KEYS.includes(sp?.sort)?sp.sort:'rank';
  const requestedPage=Number.parseInt(sp?.page,10);
  const projects=await getProjects();

  const shown=projects.filter(p=>{
    const t=(p.project_name+' '+p.description+' '+String(p.github_repo).replace(/^https?:\/\/github\.com\//i,'')).toLowerCase();
    // Every word must appear somewhere, so multi-word searches narrow rather than fail.
    if(words.some(w=>!t.includes(w))) return false;
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

  const pages=Math.max(1,Math.ceil(sorted.length/PAGE_SIZE));
  const page=Number.isInteger(requestedPage)?Math.min(Math.max(requestedPage,1),pages):1;
  const visible=sorted.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);

  const makeUrl=(nextTag=tag,nextSort=sort,nextPage=1)=>{
    const params=new URLSearchParams();
    if(nextTag!=='all') params.set('tag',nextTag);
    if(nextSort!=='rank') params.set('sort',nextSort);
    if(rawQ) params.set('q',rawQ);
    if(nextPage>1) params.set('page',String(nextPage));
    const query=params.toString();
    return '/explore'+(query?'?'+query:'');
  };

  return (
    <div className="shell">
      <Nav/>
      <main id="main" className="main">
        <div className="eyebrow">Project explorer</div>
        <h1 className="title">{projects.length} projects, one research surface.</h1>
        <p className="sub">Search the published project metadata. Category chips and relevance scores are Atlas-derived research signals, not official BharatCode classifications.</p>

        <form className="search" action="/explore">
          {tag!=='all'&&<input type="hidden" name="tag" value={tag}/>}
          {sort!=='rank'&&<input type="hidden" name="sort" value={sort}/>}
          <input name="q" defaultValue={rawQ} maxLength={200} placeholder="Search name, description or repository…" aria-label="Search projects"/>
          <button className="button" type="submit">Search</button>
        </form>

        <div className="filters">
          {tags.map(t=><a key={t} className={'chip '+(tag===t?'on':'')} href={makeUrl(t,sort)}>{tagLabels[t]}</a>)}
        </div>

        <div className="sectionhead section" style={{marginTop:20}}>
          <div>
            <h2>{shown.length} result{shown.length===1?'':'s'}</h2>
            <p>{rawQ?'Search: “'+rawQ+'” · ':''}{tag==='all'?'All signals':'Signal: '+tagLabels[tag]}</p>
          </div>
          <div className="filters">
            {SORTS.map(([value,label])=><a key={value} className={'chip '+(sort===value?'on':'')} href={makeUrl(tag,value)}>{label}</a>)}
          </div>
        </div>

        {sorted.length ? (
          <>
            <div className="grid">{visible.map(p=><ProjectCard key={p.id} p={p}/>)}</div>
            {pages>1&&<nav className="filters section" aria-label="Pagination" style={{justifyContent:'center'}}>
              {page>1&&<a className="chip" href={makeUrl(tag,sort,page-1)} rel="prev">← Previous</a>}
              <span className="chip" aria-current="page">Page {page} of {pages}</span>
              {page<pages&&<a className="chip" href={makeUrl(tag,sort,page+1)} rel="next">Next →</a>}
            </nav>}
          </>
        ) : (
          <div className="panel section empty">
            <h2>No projects matched</h2>
            <p className="prose">Try a broader search or remove the category filter.</p>
            <a className="button" href="/explore">Reset explorer</a>
          </div>
        )}
      </main>
    </div>
  );
}