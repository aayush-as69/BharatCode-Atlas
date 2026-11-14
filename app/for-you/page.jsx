'use client';

import Nav from '@/components/Nav';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';

const interests=['AI / LLM','RAG / Retrieval','AI Agents','Security','Developer Tools','Voice / Audio','Vision / OCR','Governance / Compliance','Civic / Public'];
const STORAGE='bharatcode-atlas-for-you';

export default function ForYou(){
  const [github,setGithub]=useState('');
  const [repos,setRepos]=useState([]);
  const [building,setBuilding]=useState('');
  const [selected,setSelected]=useState([]);
  const [loading,setLoading]=useState(false);
  const [result,setResult]=useState(null);
  const [error,setError]=useState('');

  useEffect(()=>{
    try{
      const saved=JSON.parse(localStorage.getItem(STORAGE)||'null');
      if(saved){
        setGithub(saved.github||''); setRepos(saved.repos||[]); setBuilding(saved.building||'');
        setSelected(saved.selected||[]); setResult(saved.result||null);
      }
    }catch{}
  },[]);

  const save=(next)=>{
    try{localStorage.setItem(STORAGE,JSON.stringify(next));}catch{}
  };

  const toggleInterest=(x)=>{
    setSelected(s=>{
      const next=s.includes(x)?s.filter(y=>y!==x):[...s,x];
      save({github,repos,building,selected:next,result});
      return next;
    });
  };

  const run=async()=>{
    setLoading(true);setError('');
    try{
      const allGithub=[github,...repos].filter(Boolean);
      const res=await fetch('/api/for-you',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({github:allGithub[0]||'',githubProfiles:allGithub,building,interests:selected})});
      const data=await res.json();
      if(!res.ok) throw new Error(data.error||'Unable to build your profile');
      setResult(data);
      save({github,repos,building,selected,result:data});
    }catch(e){setError(e.message);}
    finally{setLoading(false);}
  };

  const addRepo=()=>{
    const value=prompt('Enter another public GitHub profile URL or username');
    if(!value?.trim()) return;
    const next=[...repos,value.trim()];
    setRepos(next);save({github,repos:next,building,selected,result});
  };

  const clear=()=>{
    localStorage.removeItem(STORAGE);
    setGithub('');setRepos([]);setBuilding('');setSelected([]);setResult(null);setError('');
  };

  const profileCount=useMemo(()=>1+repos.length,[repos]);

  return <div className="shell"><Nav/><main className="main">
    <div className="eyebrow">Personal research mode</div>
    <h1 className="title">For You.</h1>
    <p className="sub">Build a private-on-this-device research profile from your GitHub and interests. Atlas uses it to find projects worth studying.</p>

    <section className="panel section">
      <div className="two">
        <div>
          <label className="label">GitHub profile</label>
          <input className="input" value={github} onChange={e=>setGithub(e.target.value)} placeholder="username or github.com/username"/>
          <div style={{marginTop:10}}>
            {repos.map((x,i)=><div className="chip" key={x}>{x}<button type="button" onClick={()=>{
              const nextRepos=repos.filter((_,j)=>j!==i);
              setRepos(nextRepos);
              save({github,repos:nextRepos,building,selected,result});
            }} style={{marginLeft:8}}>×</button></div>)}
            <button type="button" className="tag" onClick={addRepo}>+ Add another profile</button>
          </div>
          <label className="label" style={{marginTop:18}}>What are you building?</label>
          <textarea className="input" rows="5" value={building} onChange={e=>setBuilding(e.target.value)} placeholder="I'm building an AI voice agent for customer support..."/>
        </div>
        <div>
          <label className="label">What do you want to learn?</label>
          <div className="tags" style={{marginTop:10}}>
            {interests.map(x=><button type="button" className={'tag '+(selected.includes(x)?'active':'')} key={x} onClick={()=>toggleInterest(x)}>{x}</button>)}
          </div>
          <button className="button" style={{marginTop:20}} onClick={run} disabled={loading}>{loading?'Building your profile…':'Refresh recommendations →'}</button>
          <button type="button" className="tag" style={{marginTop:10,display:'block'}} onClick={clear}>Clear profile</button>
          <div className="panel" style={{marginTop:14,padding:12}}>
            <b style={{fontSize:11}}>Privacy note</b>
            <p style={{fontSize:10,color:'var(--muted)',lineHeight:1.6,margin:'6px 0 0'}}>For You uses public GitHub profile/repository information plus the interests you provide. Your profile settings and recommendations are saved in this browser's local storage. Atlas does not need your GitHub password or private repository access.</p>
          </div>
        </div>
      </div>
    </section>

    {result&&<section className="section">
      <div className="panel">
        <div className="sectionhead">
          <div><div className="eyebrow">Your Atlas profile</div><h2>{result.github?.login||'Researcher'}</h2><p>{result.profileSummary}</p></div>
          <span className="chip">{profileCount+' GitHub profile'+(profileCount===1?'':'s')}</span>
        </div>
        <div className="tags">{result.detected?.map(x=><span className="tag" key={x}>{x}</span>)}</div>
      </div>

      <section className="section">
        <div className="sectionhead"><div><h2>Strong matches</h2><p>Projects with the strongest overlap with your stated and GitHub-derived interests.</p></div></div>
        <div className="grid">{result.strongMatches?.map(x=><Link className="panel" href={'/projects/'+x.project.id} key={x.project.id}>
          <div className="eyebrow">{'Match '+x.score}</div><h3>{x.project.project_name}</h3>
          <p className="prose">{x.project.description}</p><p style={{fontSize:11,color:'var(--muted)'}}>{x.reasons.join(' · ')}</p>
        </Link>)}</div>
      </section>

      <section className="section">
        <div className="sectionhead"><div><h2>Worth exploring</h2><p>Lower-confidence matches that may still contain useful ideas.</p></div></div>
        <div className="list">{result.worthExploring?.map(x=><Link href={'/projects/'+x.project.id} key={x.project.id}>
          <b>{x.project.project_name}</b><small>{'Match '+x.score+' · '+x.reasons.join(' · ')}</small>
        </Link>)}</div>
      </section>

      <section className="panel section">
        <h2>Your technology landscape</h2>
        <p className="prose">Signals Atlas detected from your GitHub profiles and selected interests.</p>
        <div className="tags">{result.detected?.map(x=><span className="tag" key={x}>{x}</span>)}</div>
      </section>
    </section>}
  </main></div>;
}