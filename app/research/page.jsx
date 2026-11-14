'use client';

import {useEffect,useState} from 'react';
import Link from 'next/link';
import Nav from '@/components/Nav';

const KEY='bharatcode-atlas-research-v2';
const statuses=['To Study','Studying','Learned','Applied'];
const collections=['Agent Architecture','RAG Research','Security','Developer Tools','Voice AI','Vision / OCR','Governance','Civic Tech','General'];

const empty={
  status:'To Study',
  collection:'General',
  whySaved:'',
  learningGoal:'',
  architectureNotes:'',
  usefulTechnologies:'',
  ideasToAdapt:'',
  questions:'',
  personalNotes:''
};

export default function Research(){
  const [items,setItems]=useState([]);
  const [selected,setSelected]=useState(null);
  const [form,setForm]=useState(empty);
  const [collection,setCollection]=useState('General');
  const [search,setSearch]=useState('');

  useEffect(()=>{
    try{setItems(JSON.parse(localStorage.getItem(KEY)||'[]'));}catch{}
  },[]);

  function persist(next){setItems(next);localStorage.setItem(KEY,JSON.stringify(next));}

  function openItem(item){
    setSelected(item);
    setForm({...empty,...item});
  }

  function newProject(){
    setSelected({id:null,project:null});
    setForm({...empty,collection});
  }

  function save(){
    if(!form.project?.id) return;
    const nextItem={...form,id:form.id||Date.now(),updatedAt:new Date().toISOString()};
    const next=nextItem.id&&items.some(x=>x.id===nextItem.id)
      ?items.map(x=>x.id===nextItem.id?nextItem:x)
      :[{...nextItem},...items];
    persist(next);
    setSelected(nextItem);
  }

  function remove(id){
    persist(items.filter(x=>x.id!==id));
    setSelected(null);
  }

  function update(key,value){setForm(f=>({...f,[key]:value}));}

  const filtered=items.filter(x=>{
    const hay=(x.project?.project_name+' '+x.whySaved+' '+x.learningGoal+' '+x.collection).toLowerCase();
    return hay.includes(search.toLowerCase()) && (collection==='All'||x.collection===collection);
  });

  return <div className="shell"><Nav/><main className="main">
    <div className="eyebrow">Personal workspace</div>
    <h1 className="title">My research.</h1>
    <p className="sub">Turn projects into study notes, architecture observations, ideas, questions, and implementation lessons. Everything here stays in this browser.</p>

    <section className="panel section">
      <div className="sectionhead">
        <div><h2>Research library</h2><p>{items.length+' saved project'+(items.length===1?'':'s')}</p></div>
        <Link className="button" href="/explore">Find a project →</Link>
      </div>
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
        <input className="input" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search your research..." style={{flex:1,minWidth:220}}/>
        <select className="input" value={collection} onChange={e=>setCollection(e.target.value)} style={{maxWidth:220}}>
          <option>All</option>{collections.map(x=><option key={x}>{x}</option>)}
        </select>
      </div>
      <div className="list" style={{marginTop:12}}>
        {filtered.map(x=><button key={x.id} className="panel" onClick={()=>openItem(x)} style={{textAlign:'left',cursor:'pointer'}}>
          <b>{x.project?.project_name||'Untitled project'}</b>
          <small>{x.status+' · '+x.collection+' · '+new Date(x.updatedAt||x.createdAt||Date.now()).toLocaleDateString()}</small>
        </button>)}
      </div>
      {!filtered.length&&<p className="prose" style={{marginTop:14}}>Nothing saved yet. Open a project and choose “Study this”.</p>}
    </section>

    {selected&&<section className="panel section">
      <div className="sectionhead">
        <div>
          <div className="eyebrow">{selected.project?.rank?'Project #'+selected.project.rank:'Research entry'}</div>
          <h2>{selected.project?.project_name||'Select a project'}</h2>
          {selected.project&&<p className="prose">{selected.project.description}</p>}
        </div>
        {selected.project&&<Link className="chip" href={'/projects/'+selected.project.id}>Open project →</Link>}
      </div>

      <div className="tags">{statuses.map(x=><button key={x} className={'tag '+(form.status===x?'active':'')} onClick={()=>update('status',x)}>{x}</button>)}</div>

      {form.repositoryIntelligence?.ok?<section className="panel" style={{marginTop:14}}>
        <div className="sectionhead"><div><h3>Saved repository evidence</h3><p>Snapshot captured when this research entry was created.</p></div></div>
        <div className="tags">{(form.repositoryIntelligence.technologies||[]).map(x=><span className="tag" key={x}>{x}</span>)}</div>
        {form.repositoryIntelligence.evidence?.architecture_fingerprint?.length?<div className="list" style={{marginTop:10}}>
          {form.repositoryIntelligence.evidence.architecture_fingerprint.map(x=><div key={x.layer}><b>{x.layer}</b><small>{x.signal+' · '+x.evidence.join(' · ')}</small></div>)}
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
          <label className="label">{label}</label>
          {options?<select className="input" value={form[key]||'General'} onChange={e=>update(key,e.target.value)}>{options.map(x=><option key={x}>{x}</option>)}</select>
          :<textarea className="input" rows="4" value={form[key]||''} onChange={e=>update(key,e.target.value)} placeholder={'Write '+label.toLowerCase()+'...'} />}
        </div>)}
      </div>

      <div style={{display:'flex',gap:8,marginTop:16}}>
        <button className="button" onClick={save}>Save research</button>
        {form.id&&<button className="chip" onClick={()=>remove(form.id)}>Delete</button>}
      </div>
    </section>}

    <section className="panel section">
      <h2>How to use this</h2>
      <p className="prose">Open any project, save it to your workspace, then record what you learned. Move it from To Study → Studying → Learned → Applied as you turn research into implementation.</p>
    </section>
  </main></div>;
}