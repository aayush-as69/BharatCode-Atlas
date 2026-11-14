'use client';

import {useState} from 'react';
import Link from 'next/link';

const KEY='bharatcode-atlas-research-v2';

export default function StudyButton({project}){
  const [saved,setSaved]=useState(false);

  function study(){
    try{
      const items=JSON.parse(localStorage.getItem(KEY)||'[]');
      const existing=items.find(x=>x.project?.id===project.id);
      if(!existing){
        const next=[{
          id:Date.now(),
          project,
          status:'To Study',
          collection:'General',
          whySaved:'',
          learningGoal:'',
          architectureNotes:'',
          usefulTechnologies:'',
          ideasToAdapt:'',
          questions:'',
          personalNotes:'',
          createdAt:new Date().toISOString(),
          updatedAt:new Date().toISOString()
        },...items];
        localStorage.setItem(KEY,JSON.stringify(next));
      }
      setSaved(true);
    }catch{}
  }

  return saved
    ? <Link className="button" href="/research">Open Research Workspace →</Link>
    : <button className="button" type="button" onClick={study}>Study this</button>;
}