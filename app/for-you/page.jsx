'use client';

import Nav from '@/components/Nav';
import {useEffect,useState} from 'react';
import Link from 'next/link';

const interests=['AI / LLM','RAG / Retrieval','AI Agents','Security','Developer Tools','Voice / Audio','Vision / OCR','Governance / Compliance','Civic / Public'];
const STORAGE='bharatcode-atlas-for-you';
const MAX_PROFILES=5;

// localStorage is user-editable and may hold data from an older version, so
// nothing read from it is trusted: every field is checked and capped.
const isText=v=>typeof v==='string';
const textList=(v,max,len)=>(Array.isArray(v)?v.filter(isText).map(x=>x.slice(0,len)).slice(0,max):[]);
function cleanMatch(x){
  const p=x&&x.project;
  if(!p||!isText(p.id)||!isText(p.project_name)) return null;
  return {
    project:{id:p.id.slice(0,200),project_name:p.project_name.slice(0,300),description:isText(p.description)?p.description.slice(0,1200):''},
    score:Number.isFinite(x.score)?x.score:0,
    reasons:textList(x.reasons,6,200)
  };
}
function cleanResult(r){
  if(!r||typeof r!=='object') return null;
  const matches=list=>(Array.isArray(list)?list:[]).map(cleanMatch).filter(Boolean).slice(0,24);
  const g=r.github&&typeof r.github==='object'?r.github:null;
  return {
    github:g?{login:isText(g.login)?g.login.slice(0,80):'',name:isText(g.name)?g.name.slice(0,120):null,bio:isText(g.bio)?g.bio.slice(0,400):null,profiles:textList(g.profiles,5,80),repoCount:Number.isFinite(g.repoCount)?g.repoCount:0}:null,
    profileSummary:isText(r.profileSummary)?r.profileSummary.slice(0,400):'',
    detected:textList(r.detected,12,60),
    strongMatches:matches(r.strongMatches),
    worthExploring:matches(r.worthExploring)
  };
}

export default function ForYou(){
  const [github,setGithub]=useState('');
  const [repos,setRepos]=useState([]);
  const [extra,setExtra]=useState('');
  const [building,setBuilding]=useState('');
  const [selected,setSelected]=useState([]);
  const [loading,setLoading]=useState(false);
  const [result,setResult]=useState(null);
  const [error,setError]=useState('');
  const [hydrated,setHydrated]=useState(false);

  useEffect(()=>{
    try{
      const saved=JSON.parse(localStorage.getItem(STORAGE)||'null');
      if(saved){
        setGithub(isText(saved.github)?saved.github.slice(0,200):''); setRepos(textList(saved.repos,5,200)); setBuilding(isText(saved.building)?saved.building.slice(0,1000):'');
        setSelected(textList(saved.selected,12,60)); setResult(cleanResult(saved.result));
      }
    }catch{}
    setHydrated(true);
  },[]);

  // One place persists everything, so saved state can never be one step stale.
  useEffect(()=>{
    if(!hydrated) return;
    try{localStorage.setItem(STORAGE,JSON.stringify({github,repos,building,selected,result}));}catch{}
  },[hydrated,github,repos,building,selected,result]);

  const toggleInterest=x=>setSelected(s=>s.includes(x)?s.filter(y=>y!==x):[...s,x]);

  const profiles=[github.trim(),...repos].filter(Boolean);

  const run=async()=>{
    if(!profiles.length&&!building.trim()&&!selected.length){
      setError('Add a GitHub profile, describe what you are building, or pick at least one interest.');
      return;
    }
    setLoading(true);setError('');
    try{
      const res=await fetch('/api/for-you',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({github:profiles[0]||'',githubProfiles:profiles,building,interests:selected})});
      const data=await res.json().catch(()=>({}));
      if(!res.ok) throw new Error(data.error||'Unable to build your profile');
      setResult(data);
    }catch(e){setError(e.message||'Unable to build your profile');}
    finally{setLoading(false);}
  };

  const addProfile=e=>{
    e.preventDefault();
    const value=extra.trim();
    if(!value||repos.includes(value)||repos.length>=MAX_PROFILES-1) return;
    setRepos([...repos,value]);
    setExtra('');
  };

  const clear=()=>{
    try{localStorage.removeItem(STORAGE);}catch{}
    setGithub('');setRepos([]);setExtra('');setBuilding('');setSelected([]);setResult(null);setError('');
  };

  const strong=result?.strongMatches||[];
  const worth=result?.worthExploring||[];

  return <div className="shell"><Nav/><main id="main" className="main">
    <div className="eyebrow">Personal research mode</div>
    <h1 className="title">For You.</h1>
    <p className="sub">Build a research profile from your GitHub and interests. Atlas uses it to find projects worth studying.</p>

    <section className="panel section">
      <div className="two">
        <div>
          <label className="label" htmlFor="fy-github">GitHub profile</label>
          <input id="fy-github" className="input" value={github} onChange={e=>setGithub(e.target.value)} placeholder="username or github.com/username" maxLength={200}/>
          <div className="tags" style={{marginTop:10}}>
            {repos.map((x,i)=><span className="chip" key={x+'-'+i}>{x}<button type="button" aria-label={'Remove '+x} onClick={()=>setRepos(repos.filter((_,j)=>j!==i))} style={{marginLeft:8}}>×</button></span>)}
          </div>
          {repos.length<MAX_PROFILES-1&&<form onSubmit={addProfile} style={{display:'flex',gap:8,marginTop:10}}>
            <input className="input" aria-label="Another GitHub profile" value={extra} onChange={e=>setExtra(e.target.value)} placeholder="Another username or profile URL" maxLength={200} style={{flex:1}}/>
            <button type="submit" className="tag">+ Add</button>
          </form>}
          <label className="label" htmlFor="fy-building" style={{marginTop:18}}>What are you building?</label>
          <textarea id="fy-building" className="input" rows="5" value={building} onChange={e=>setBuilding(e.target.value)} maxLength={1000} placeholder="I'm building an AI voice agent for customer support..."/>
        </div>
        <div>
          <p className="label" id="fy-interests">What do you want to learn?</p>
          <div className="tags" role="group" aria-labelledby="fy-interests" style={{marginTop:10}}>
            {interests.map(x=><button type="button" aria-pressed={selected.includes(x)} className={'tag '+(selected.includes(x)?'active':'')} key={x} onClick={()=>toggleInterest(x)}>{x}</button>)}
          </div>
          <button className="button" type="button" style={{marginTop:20}} onClick={run} disabled={loading}>{loading?'Building your profile…':'Refresh recommendations →'}</button>
          <button type="button" className="tag" style={{marginTop:10,display:'block'}} onClick={clear}>Clear profile</button>
          {error&&<p role="alert" className="notice" style={{marginTop:12}}>{error}</p>}
          <div className="panel" style={{marginTop:14,padding:12}}>
            <b style={{fontSize:12}}>Privacy note</b>
            <p style={{fontSize:12,color:'var(--muted)',lineHeight:1.6,margin:'6px 0 0'}}>Atlas sends the GitHub usernames, description and interests you enter to its server so it can read public GitHub profile data and score projects; it does not store them there. Your settings and results are saved only in this browser's local storage. Atlas never asks for your GitHub password or private repository access.</p>
          </div>
        </div>
      </div>
    </section>

    {result&&<section className="section">
      <div className="panel">
        <div className="sectionhead">
          <div><div className="eyebrow">Your Atlas profile</div><h2>{result.github?.login||'Researcher'}</h2><p>{result.profileSummary}</p></div>
          {result.github&&<span className="chip">{(result.github.profiles?.length||1)+' GitHub profile'+((result.github.profiles?.length||1)===1?'':'s')}</span>}
        </div>
        {result.detected?.length?<><p className="prose">Languages and topics Atlas detected on your GitHub.</p><div className="tags">{result.detected.map(x=><span className="tag" key={x}>{x}</span>)}</div></>:null}
      </div>

      {!strong.length&&!worth.length&&<div className="panel section">
        <h2>No matching projects</h2>
        <p className="prose">Nothing in the corpus overlapped with this profile. Try selecting more interests, or describe your idea in more detail.</p>
      </div>}

      {strong.length>0&&<section className="section">
        <div className="sectionhead"><div><h2>Strong matches</h2><p>Projects with the strongest overlap with your stated and GitHub-derived interests.</p></div></div>
        <div className="grid">{strong.map(x=><Link className="panel" href={'/projects/'+encodeURIComponent(x.project.id)} key={x.project.id}>
          <div className="eyebrow">{'Match '+x.score}</div><h3>{x.project.project_name}</h3>
          <p className="prose">{x.project.description}</p><p style={{fontSize:12,color:'var(--muted)'}}>{x.reasons.join(' · ')}</p>
        </Link>)}</div>
      </section>}

      {worth.length>0&&<section className="section">
        <div className="sectionhead"><div><h2>Worth exploring</h2><p>Lower-confidence matches that may still contain useful ideas.</p></div></div>
        <div className="list">{worth.map(x=><Link href={'/projects/'+encodeURIComponent(x.project.id)} key={x.project.id}>
          <b>{x.project.project_name}</b><small>{'Match '+x.score+' · '+x.reasons.join(' · ')}</small>
        </Link>)}</div>
      </section>}
    </section>}
  </main></div>;
}
