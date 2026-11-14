const STOPWORDS=new Set('a an and are as at be but by for from has have how i in is it its of on or that the this to was what when where which who will with you your do does did can could should would there their they them then than so if about into over under again more most some such no nor not only own same too very just also may might must shall related find worth show give tell having been between each those these'.split(' '));

// Short terms that are meaningless as substrings but valuable as exact words.
const ALLOWLIST=new Set(['ai','rag','llm','ocr','nlp','tts','stt','api','gpt','iot','ev','ar','vr','kyc','ui','ux','ml','asr','b2b','d2c','erp','crm']);

function escapeRegExp(value){
  return value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
}

export function extractQueryTerms(question){
  const cleaned=String(question||'').toLowerCase().replace(/[^a-z0-9\s-]/g,' ');
  const tokens=cleaned.split(/\s+/).filter(Boolean);
  const terms=[];
  for(const token of tokens){
    if(STOPWORDS.has(token)) continue;
    const parts=token.includes('-')?token.split('-'):null;
    const keep=token.length>=4||ALLOWLIST.has(token);
    if(keep&&!terms.includes(token)) terms.push(token);
    // Hyphenated queries like "developer-tool" also match their components.
    if(parts){
      for(const part of parts){
        if((part.length>=4||ALLOWLIST.has(part))&&!terms.includes(part)) terms.push(part);
      }
    }
  }
  return terms;
}

// Match a term against a text pair (original + lowercased):
// 1. full word (plural-tolerant) in the lowercased text
// 2. compound-word prefix in the original text, e.g. "rag" -> "RAGDesk"
function termHit(originalText,lowerText,term){
  if(!term) return false;
  if(!/^[a-z0-9]+$/.test(term)) return lowerText.includes(term);
  const escaped=escapeRegExp(term);
  const start='(?:^|[^a-z0-9])';
  if(new RegExp(start+escaped+'s?(?:[^a-z0-9]|$)').test(lowerText)) return true;
  return new RegExp(start+escaped+'(?=[A-Z0-9])','i').test(originalText);
}

export function retrieveProjects(projects,question,limit=12){
  const terms=extractQueryTerms(question);
  if(!terms.length) return [];
  const scored=[];
  for(const project of projects){
    const original=((project.project_name||'')+' '+(project.description||''));
    const lower=original.toLowerCase();
    const hits=terms.filter(term=>termHit(original,lower,term));
    if(!hits.length) continue;
    scored.push({project,score:hits.length,terms:hits});
  }
  scored.sort((a,b)=>b.score-a.score||(a.project.rank??999)-(b.project.rank??999));
  return scored.slice(0,limit).map(x=>x.project);
}
