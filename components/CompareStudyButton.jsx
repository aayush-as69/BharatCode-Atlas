'use client';

import Link from 'next/link';

export default function CompareStudyButton({projects}){
  function save(){
    try{
      const key='bharatcode-atlas-research-v2';
      const items=JSON.parse(localStorage.getItem(key)||'[]');
      const existing=items.find(x=>x.comparison&&x.comparison.join(',')===projects.map(p=>p.id).join(','));
      if(!existing){
        items.unshift({
          id:Date.now(),
          comparison:projects.map(p=>p.id),
          project:{id:'comparison-'+Date.now(),project_name:'Comparison: '+projects.map(p=>p.project_name).join(' vs '),description:'Architecture comparison saved from Atlas.'},
          status:'To Study',
          collection:'General',
          whySaved:'Compare these implementations',
          learningGoal:'Understand the architectural tradeoffs between these projects',
          architectureNotes:'',
          usefulTechnologies:'',
          ideasToAdapt:'',
          questions:'',
          personalNotes:'',
          createdAt:new Date().toISOString(),
          updatedAt:new Date().toISOString()
        });
        localStorage.setItem(key,JSON.stringify(items));
      }
    }catch{}
  }
  return <Link className="button" href="/research" onClick={save}>Study this comparison →</Link>;
}