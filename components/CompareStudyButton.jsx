'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {addResearchEntry,newEntryId} from '@/lib/research-storage';

export default function CompareStudyButton({projects}){
  const [error,setError]=useState('');
  const router=useRouter();

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
    if(result.ok){setError('');router.push('/research');}
    else setError(result.error);
  }

  return <>
    <button className="button primary" type="button" onClick={save}>Study this comparison →</button>
    {error?<span role="alert" className="notice">{error}</span>:null}
  </>;
}
