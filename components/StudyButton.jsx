'use client';

import {useState} from 'react';
import Link from 'next/link';
import {addResearchEntry,newEntryId,EMPTY_NOTES} from '@/lib/research-storage';

export default function StudyButton({project,repositoryIntelligence=null}){
  const [saved,setSaved]=useState(false);
  const [error,setError]=useState('');

  function study(){
    const now=new Date().toISOString();
    const result=addResearchEntry({id:newEntryId(),project,repositoryIntelligence,...EMPTY_NOTES,createdAt:now,updatedAt:now});
    if(result.ok){setSaved(true);setError('');}
    else setError(result.error);
  }

  return <>
    {saved
      ? <Link className="button primary" href="/research">Open Research Workspace →</Link>
      : <button className="button primary" type="button" onClick={study}>Study this</button>}
    {error?<span role="alert" className="notice">{error}</span>:null}
  </>;
}
