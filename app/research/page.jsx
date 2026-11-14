'use client';

import {useEffect,useState} from 'react';
import Link from 'next/link';
import Nav from '@/components/Nav';

const KEY='bharatcode-atlas-research-v1';
const defaults=['BrandGuard Ideas','Agent Architecture','RAG Research','Security','Voice AI','Developer Tools'];

export default function Research(){
  const [items,setItems]=useState([]);
  const [collection,setCollection]=useState('BrandGuard Ideas');
  const [note,setNote]=useState('');

  useEffect(()=>{try{setItems(JSON.parse(localStorage.getItem(KEY)||'[]'));}catch{}},[]);
  function addNote(){
    if(!note.trim()) return;
    const next=[{id:Date.now(),collection,text:note.trim(),createdAt:new Date().toISOString()},...items];
    setItems(next);localStorage.setItem(KEY,JSON.stringify(next));setNote('');
  }
  function remove(id){
    const next=items.filter(x=>x.id!==id);setItems(next);localStorage.setItem(KEY,JSON.stringify(next));
  }

  return <div className="shell"><Nav/><main className="main">
    <div className="eyebrow">Personal workspace</div>
    <h1 className="title">My research.</h1>
    <p className="sub">Save lightweight research notes locally in this browser. No account or server database is being pretended here.</p>

    <section className="panel section">
      <div className="sectionhead"><div><h2>Collections</h2><p>Use these as research buckets while exploring.</p></div></div>
      <div className="tags">{defaults.map(x=><button key={x} className={'chip '+(collection===x?'on':'')} onClick={()=>setCollection(x)}>{x}</button>)}</div>
    </section>

    <section className="panel section">
      <h2>Add a research note</h2>
      <div style={{display:'flex',gap:8,marginTop:12}}>
        <input value={note} onChange={e=>setNote(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addNote()} placeholder={'What did you learn for '+collection+'?'} style={{flex:1}}/>
        <button className="button" onClick={addNote}>Save note</button>
      </div>
    </section>

    <section className="section">
      <div className="sectionhead"><div><h2>{collection}</h2><p>{items.filter(x=>x.collection===collection).length} saved notes</p></div></div>
      <div className="list">{items.filter(x=>x.collection===collection).map(x=><div key={x.id} className="panel" style={{marginBottom:8}}><p className="prose">{x.text}</p><button className="chip" onClick={()=>remove(x.id)}>Remove</button></div>)}</div>
      {!items.filter(x=>x.collection===collection).length&&<div className="panel"><p className="prose">No notes yet. Use this space while investigating projects.</p></div>}
    </section>

    <Link className="button" href="/explore">Back to projects →</Link>
  </main></div>;
}