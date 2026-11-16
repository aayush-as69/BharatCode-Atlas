'use client';

import {useState} from 'react';
import Link from 'next/link';
import {addResearchEntry,newEntryId} from '@/lib/research-storage';

export default function CompareStudyButton({projects}){
  const [error,setError]=useState('');

  function save(){
    const now=new Date().toISOString();
    const id=newEntryId();
    const result=addResearchEntry({
      id,
      comparison:projects.map(p=>p.id),
      project:{id:'comparison-'+id,project_name:'Comparison: '+projects.map(p=>p.project_name).join(' vs '),description:'Architecture comparison saved from Atlas.'},
      status:'To Study',
      collection:'General',
      whySaved:'Compare these implementations',
      learningGoal:'Understand the architectural tradeoffs between these projects',
      architectureNotes:'',
      usefulTechnologies:'',
      ideasToAdapt:'',
      questions:'',
      personalNotes:'',
      createdAt:now,
      updatedAt:now
    });
    setError(result.ok?'':result.error);
  }

  return <>
    <Link className="button primary" href="/research" onClick={save}>Study this comparison →</Link>
    {error?<span role="alert" className="notice">{error}</span>:null}
  </>;
}
