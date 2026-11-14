import {NextResponse} from 'next/server';
import {getProjects} from '@/lib/source';
import {askBharatCode} from '@/lib/ai';

const MAX_BODY_BYTES=8_192;
const MAX_QUESTION_CHARS=600;
const WINDOW_MS=60_000;
const MAX_REQUESTS_PER_WINDOW=5;
const MAX_CONCURRENT_AI_REQUESTS=2;

const requestLog=new Map();
let activeAIRequests=0;

function getClientKey(req){
  const forwarded=req.headers.get('x-forwarded-for');
  const real=req.headers.get('x-real-ip');
  return (forwarded?.split(',')[0]||real||'unknown').trim();
}

function rateLimit(key){
  const now=Date.now();
  const existing=requestLog.get(key)||[];
  const recent=existing.filter(timestamp=>now-timestamp<WINDOW_MS);

  if(recent.length>=MAX_REQUESTS_PER_WINDOW){
    const retryAfter=Math.max(1,Math.ceil((WINDOW_MS-(now-recent[0]))/1000));
    requestLog.set(key,recent);
    return {allowed:false,retryAfter};
  }

  recent.push(now);
  requestLog.set(key,recent);

  // Keep the in-memory limiter bounded on long-running processes.
  if(requestLog.size>5_000){
    for(const [entryKey,timestamps] of requestLog){
      if(!timestamps.some(timestamp=>now-timestamp<WINDOW_MS)) requestLog.delete(entryKey);
    }
  }

  return {allowed:true};
}

export async function POST(req){
  const contentLength=Number(req.headers.get('content-length')||0);
  if(contentLength>MAX_BODY_BYTES){
    return NextResponse.json({error:'Research request is too large.'},{status:413});
  }

  const clientKey=getClientKey(req);
  const limit=rateLimit(clientKey);
  if(!limit.allowed){
    return NextResponse.json(
      {error:'Too many research requests. Please try again shortly.'},
      {status:429,headers:{'Retry-After':String(limit.retryAfter)}}
    );
  }

  if(activeAIRequests>=MAX_CONCURRENT_AI_REQUESTS){
    return NextResponse.json(
      {error:'Research capacity is temporarily busy. Please try again shortly.'},
      {status:429,headers:{'Retry-After':'15'}}
    );
  }

  try{
    const {question}=await req.json();

    if(!question||typeof question!=='string'){
      return NextResponse.json({error:'Question is required'},{status:400});
    }

    const normalizedQuestion=question.trim();
    if(!normalizedQuestion){
      return NextResponse.json({error:'Question is required'},{status:400});
    }

    if(normalizedQuestion.length>MAX_QUESTION_CHARS){
      return NextResponse.json(
        {error:`Question must be ${MAX_QUESTION_CHARS} characters or fewer.`},
        {status:413}
      );
    }

    const words=normalizedQuestion.toLowerCase().split(/\s+/).filter(x=>x.length>4);
    const projects=(await getProjects())
      .filter(p=>words.some(w=>(p.project_name+' '+p.description).toLowerCase().includes(w)))
      .slice(0,12);

    const context=projects.map(p=>`#${p.rank} ${p.project_name}\n${p.description}\nVotes: ${p.votes}; GitHub stars: ${p.github_stars}; Community score: ${p.community_score}\nRepo: ${p.github_repo}`).join('\n\n');
    const prompt=`You are BharatCode Atlas Researcher. Answer only from the supplied project evidence. If the evidence is insufficient, say so. Question: ${normalizedQuestion}\n\nProject evidence:\n${context}`;

    activeAIRequests+=1;
    try{
      const result=await askBharatCode(prompt);

      return NextResponse.json({
        question:normalizedQuestion,
        projects,
        answer:result.ok?result.text:null,
        error:result.ok?null:result.error
      });
    }finally{
      activeAIRequests=Math.max(0,activeAIRequests-1);
    }
  }catch{
    return NextResponse.json({error:'Invalid research request'},{status:400});
  }
}
