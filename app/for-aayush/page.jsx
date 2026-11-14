'use client';

import Nav from '@/components/Nav';
import {useMemo,useState} from 'react';
import Link from 'next/link';

const interests=['AI / LLM','RAG / Retrieval','AI Agents','Security','Developer Tools','Voice / Audio','Vision / OCR','Governance / Compliance','Civic / Public'];

export default function ForYou(){
  const [github,setGithub]=useState('');
  const [building,setBuilding]=useState('');
  const [selected,setSelected]=useState([]);
  const [loading,setLoading]=useState(false);
  const [result,setResult]=useState(null);
  const [error,setError]=useState('');

  const run=async()=>{
    setLoading(true);setError('');
    try{
      const res=await fetch('/api/for-you',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({github,building,interests:selected})});
      const data=await res.json();
      if(!res.ok) throw new Error(data.error||'Unable to build your profile');
      setResult(data);
    }catch(e){setError(e.message);}
    finally{setLoading(false);}
  };

  const interestText=useMemo(()=>selected.join(', '),[selected]);

  return <div className="shell"><Nav/><main className="main">
    <div className="eyebrow">Personal research mode</div>
    <h1 className="title">For You.</h1>
    <p className="sub">Tell Atlas what you build and optionally connect your public GitHub. It will find BharatCode projects worth studying for <i>you</i>.</p>

    <section className="panel section">
      <div className="two">
        <div>
          <label className="label">GitHub username or profile URL</label>
          <input className="input" value={github} onChange={e=>setGithub(e.target.value)} placeholder="e.g. octocat or github.com/octocat"/>
          <label className="label" style={{marginTop:16}}>What are you building?</label>
          <textarea className="input" rows="5" value={building} onChange={e=>setBuilding(e.target.value)} placeholder="I'm building an AI voice agent for customer support..."/>
        </div>
        <div>
          <label className="label">What do you want to learn?</label>
          <div className="tags" style={{marginTop:10}}>
            {interests.map(x=><button type="button" className={'tag '+(selected.includes(x)?'active':'')} key={x} onClick={()=>setSelected(s=>s.includes(x)?s.filter(y=>y!==x):[...s,x])}>{x}</button>)}
          </div>
          <button className="button" style={{marginTop:20}} onClick={run} disabled={loading}>{loading?'Building your profile…':'Find projects for me →'}</button>
          {error&&<p className="prose" style={{marginTop:12}}>{error}</p>}
        </div>
      </div>
    </section>

    {result&&<section className="section">
      <div className="panel">
        <div className="sectionhead">
          <div><div className="eyebrow">Your Atlas profile</div><h2>{result.github?.login||'Researcher'}</h2><p>{result.profileSummary}</p></div>
        </div>
        <div className="tags">{result.detected?.map(x=><span className="tag" key={x}>{x}</span>)}</div>
      </div>

      <div className="grid" style={{marginTop:12}}>
        {result.recommendations.map(x=><Link className="panel" href={'/projects/'+x.project.id} key={x.project.id}>
          <div className="eyebrow">{'Match '+x.score}</div>
          <h3>{x.project.project_name}</h3>
          <p className="prose">{x.project.description}</p>
          <p style={{fontSize:11,color:'var(--muted)'}}>{x.reasons.join(' · ')}</p>
        </Link>)}
      </div>
    </section>}
  </main></div>;
}