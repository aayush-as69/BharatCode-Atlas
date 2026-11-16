'use client';

import {useEffect,useState} from 'react';
import Link from 'next/link';
import Nav from '@/components/Nav';
import {loadResearch,saveResearch,newEntryId,EMPTY_NOTES,RESEARCH_KEY} from '@/lib/research-storage';

const statuses=['To Study','Studying','Learned','Applied'];
const collections=['Agent Architecture','RAG Research','Security','Developer Tools','Voice AI','Vision / OCR','Governance','Civic Tech','General'];

export default function Research(){
  const [items,setItems]=useState([]);
  const [selected,setSelected]=useState(null);
  const [form,setForm]=useState(EMPTY_NOTES);
  const [collection,setCollection]=useState('All');
  const [search,setSearch]=useState('');
  const [message,setMessage]=useState('');

  useEffect(()=>{
    setItems(loadResearch());
    // Keep several open tabs in sync.
    const onStorage=e=>{if(e.key===RESEARCH_KEY||e.key===null) setItems(loadResearch());};
    window.addEventListener('storage',onStorage);
    return ()=>window.removeEventListener('storage',onStorage);
  },[]);

  // Returns true when saved. State only changes after a successful write, so the
  // screen never shows data that is not actually stored.
  function persist(next){
    const result=saveResearch(next);
    if(!result.ok){setMessage(result.error);return false;}
    setItems(next);
    setMessage('');
    return true;
  }

  function openItem(item){
    setSelected(item);
    setForm({...EMPTY_NOTES,...item});
    setMessage('');
  }

  function save(){
    if(!form.project?.id) return;
    const now=new Date().toISOString();
    const nextItem={...form,id:form.id||newEntryId(),createdAt:form.createdAt||now,updatedAt:now};
    const next=items.some(x=>x.id===nextItem.id)
      ?items.map(x=>x.id===nextItem.id?nextItem:x)
      :[nextItem,...items];
    if(persist(next)){
      setSelected(nextItem);
      setForm(nextItem);
      setMessage('Saved.');
    }
  }

  function remove(id){
    if(persist(items.filter(x=>x.id!==id))) setSelected(null);
  }

  function update(key,value){setForm(f=>({...f,[key]:value}));}

  const needle=search.toLowerCase();
  const filtered=items.filter(x=>{
    const hay=[x.project?.project_name,x.whySaved,x.learningGoal,x.collection].map(v=>v??'').join(' ').toLowerCase();
    return hay.includes(needle) && (collection==='All'||x.collection===collection);
  });
  const comparedIds=selected?.comparison||[];
  const isComparison=comparedIds.length>0;

  return <div className="shell"><Nav/><main id="main" className="main">
    <div className="eyebrow">Personal workspace</div>
    <h1 className="title">My research.</h1>
    <p className="sub">Turn projects into study notes, architecture observations, ideas, questions, and implementation lessons. Everything here stays in this browser.</p>

    <section className="panel section">
      <div className="sectionhead">
        <div><h2>Research library</h2><p>{items.length+' saved project'+(items.length===1?'':'s')}</p></div>
        <Link className="button" href="/explore">Find a project →</Link>
      </div>
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
        <input className="input" aria-label="Search your research" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search your research..." style={{flex:1,minWidth:220}}/>
        <select className="input" aria-label="Filter by collection" value={collection} onChange={e=>setCollection(e.target.value)} style={{maxWidth:220}}>
          <option>All</option>{collections.map(x=><option key={x}>{x}</option>)}
        </select>
      </div>
      <div className="list" style={{marginTop:12}}>
        {filtered.map(x=><button key={x.id} type="button" className="panel" onClick={()=>openItem(x)} style={{textAlign:'left',cursor:'pointer'}}>
          <b>{x.project?.project_name||'Untitled project'}</b>
          <small>{x.status+' · '+x.collection+' · '+(x.repositoryIntelligence?.ok?'Evidence saved':'No evidence snapshot')+' · '+new Date(x.updatedAt||x.createdAt||Date.now()).toLocaleDateString()}</small>
        </button>)}
      </div>
      {!filtered.length&&<p className="prose" style={{marginTop:14}}>{items.length?'No saved research matches this search or collection.':'Nothing saved yet. Open a project and choose “Study this”.'}</p>}
    </section>

    {selected&&<section className="panel section">
      <div className="sectionhead">
        <div>
          <div className="eyebrow">{selected.project?.rank?'Project #'+selected.project.rank:isComparison?'Comparison':'Research entry'}</div>
          <h2>{selected.project?.project_name||'Select a project'}</h2>
          {selected.project&&<p className="prose">{selected.project.description}</p>}
        </div>
        {selected.project&&!isComparison&&<Link className="chip" href={'/projects/'+encodeURIComponent(selected.project.id)}>Open project →</Link>}
        {isComparison&&<Link className="chip" href={'/compare?projects='+encodeURIComponent(comparedIds.join(','))}>Reopen comparison →</Link>}
      </div>

      {form.repositoryIntelligence?.ok?<div className="panel" style={{marginTop:14}}>
        <h3>Study checklist</h3>
        <div className="list">
          <div><b>1. Explain the architecture</b><small>Write the request/data flow in your own words.</small></div>
          <div><b>2. Identify the strongest implementation choice</b><small>Record what you would keep if building a similar system.</small></div>
          <div><b>3. Identify a tradeoff</b><small>Record one architectural decision you would question or change.</small></div>
          <div><b>4. Extract an adaptable idea</b><small>Turn the observation into an idea for one of your own projects.</small></div>
          <div><b>5. Mark it Applied</b><small>Move the research to Applied only after you actually use the lesson.</small></div>
        </div>
      </div>:null}

      <div className="tags" role="group" aria-label="Status">{statuses.map(x=><button key={x} type="button" aria-pressed={form.status===x} className={'tag '+(form.status===x?'active':'')} onClick={()=>update('status',x)}>{x}</button>)}</div>

      {form.repositoryIntelligence?.ok?<section className="panel" style={{marginTop:14}}>
        <div className="sectionhead"><div><h3>Saved repository evidence</h3><p>Snapshot captured when this research entry was created.</p></div></div>
        <div className="tags">{(form.repositoryIntelligence.technologies||[]).map(x=><span className="tag" key={x}>{x}</span>)}</div>
        {form.repositoryIntelligence.evidence?.architecture_fingerprint?.length?<div className="list" style={{marginTop:10}}>
          {form.repositoryIntelligence.evidence.architecture_fingerprint.map((x,i)=><div key={x.layer+'-'+i}><b>{x.layer}</b><small>{x.signal+' · '+(x.evidence||[]).join(' · ')}</small></div>)}
        </div>:null}
      </section>:null}

      <div className="two" style={{marginTop:16}}>
        {[
          ['collection','Collection',collections],
          ['whySaved','Why I saved it'],
          ['learningGoal','What I want to learn'],
          ['architectureNotes','Architecture notes'],
          ['usefulTechnologies','Useful technologies'],
          ['ideasToAdapt','Ideas to adapt'],
          ['questions','Questions'],
          ['personalNotes','Personal notes']
        ].map(([key,label,options])=><div key={key}>
          <label className="label" htmlFor={'research-'+key}>{label}</label>
          {options?<select id={'research-'+key} className="input" value={form[key]||'General'} onChange={e=>update(key,e.target.value)}>{options.map(x=><option key={x}>{x}</option>)}</select>
          :<textarea id={'research-'+key} className="input" rows="4" value={form[key]||''} onChange={e=>update(key,e.target.value)} placeholder={'Write '+label.toLowerCase()+'...'} />}
        </div>)}
      </div>

      <div style={{display:'flex',gap:8,marginTop:16,alignItems:'center',flexWrap:'wrap'}}>
        <button className="button" type="button" onClick={save}>Save research</button>
        {form.id&&<button className="chip" type="button" onClick={()=>remove(form.id)}>Delete</button>}
        {message&&<span role="status" className="notice">{message}</span>}
      </div>
    </section>}

    <section className="panel section">
      <h2>How to use this</h2>
      <p className="prose">Open any project, save it to your workspace, then record what you learned. Move it from To Study → Studying → Learned → Applied as you turn research into implementation.</p>
    </section>
  </main></div>;
}
