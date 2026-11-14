'use client';

import {useState} from 'react';
import Nav from '@/components/Nav';

const examples=[
  'Which projects have the strongest RAG signals?',
  'What projects could inspire BrandGuard?',
  'Find projects related to voice agents and retrieval.',
  'Which developer-tool projects are worth investigating?'
];

export default function AIResearcher(){
  const [question,setQuestion]=useState('');
  const [loading,setLoading]=useState(false);
  const [result,setResult]=useState(null);
  const [error,setError]=useState('');

  async function ask(e){
    e?.preventDefault();
    if(!question.trim()) return;
    setLoading(true);setError('');setResult(null);
    try{
      const res=await fetch('/api/research',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({question})});
      const data=await res.json();
      if(!res.ok) throw new Error(data.error||'Research request failed');
      setResult(data);
    }catch(err){setError(err.message||'Research request failed');}
    finally{setLoading(false);}
  }

  return <div className="shell"><Nav/><main className="main">
    <div className="eyebrow">Atlas Researcher</div>
    <h1 className="title">Ask across 294 projects.</h1>
    <p className="sub">Atlas retrieves matching project records first. If the BharatCode model is configured, the answer is generated only from that retrieved evidence.</p>

    <form className="panel section" onSubmit={ask}>
      <textarea className="input" value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Ask a research question…" rows={4} style={{resize:'vertical'}}/>
      <div style={{display:'flex',gap:8,marginTop:10,flexWrap:'wrap'}}>
        <button className="button" disabled={loading}>{loading?'Researching…':'Ask Atlas'}</button>
        {examples.map(x=><button type="button" className="chip" key={x} onClick={()=>setQuestion(x)}>{x}</button>)}
      </div>
    </form>

    {error&&<div className="notice section">{error}</div>}

    {result&&<div className="two section">
      <section className="panel"><div className="sectionhead"><div><h2>Answer</h2><p>Provider output, if configured.</p></div></div><p className="prose" style={{whiteSpace:'pre-wrap'}}>{result.answer||result.error||'No model answer returned.'}</p></section>
      <section className="panel"><div className="sectionhead"><div><h2>Evidence</h2><p>{result.projects?.length||0} project records retrieved.</p></div></div><div className="list">{(result.projects||[]).map(p=><a key={p.id} href={'/projects/'+p.id}><b>#{p.rank} {p.project_name}</b><small>{p.description}</small></a>)}</div></section>
    </div>}
  </main></div>;
}