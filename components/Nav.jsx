'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useState} from 'react';

function Icon({children}){
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

const icons={
  overview:<Icon><circle cx="8" cy="8" r="6.4"/><path d="M10.6 5.4 9.1 9.1 5.4 10.6 6.9 6.9z"/></Icon>,
  explore:<Icon><circle cx="7.2" cy="7.2" r="4.6"/><path d="M13.4 13.4 10.4 10.4"/></Icon>,
  categories:<Icon><path d="M8 1.8 14 5 8 8.2 2 5z"/><path d="M2.6 8.2 8 11l5.4-2.8"/><path d="M2.6 11.2 8 14l5.4-2.8"/></Icon>,
  gems:<Icon><path d="M8 2l1.4 4.1L13.5 7.5 9.4 8.9 8 13 6.6 8.9 2.5 7.5 6.6 6.1z"/></Icon>,
  compare:<Icon><rect x="2" y="2.5" width="5" height="11" rx="1.2"/><rect x="9" y="2.5" width="5" height="11" rx="1.2"/></Icon>,
  foryou:<Icon><circle cx="8" cy="5.4" r="2.9"/><path d="M2.8 13.6c.7-2.6 2.7-4 5.2-4s4.5 1.4 5.2 4"/></Icon>,
  research:<Icon><rect x="2.8" y="1.8" width="10.4" height="12.4" rx="1.6"/><path d="M5.8 1.8v12.4"/></Icon>,
  intelligence:<Icon><circle cx="4.5" cy="3.6" r="1.7"/><circle cx="4.5" cy="12.4" r="1.7"/><circle cx="11.5" cy="5.4" r="1.7"/><path d="M4.5 5.3v5.4"/><path d="M11.5 7.1c0 2.3-2.9 2.6-5.2 3.3"/></Icon>,
  rankings:<Icon><path d="M3 13.5V9.5"/><path d="M8 13.5V4"/><path d="M13 13.5V7"/></Icon>,
  ai:<Icon><path d="M9.2 2.4l1 2.7 2.7 1-2.7 1-1 2.7-1-2.7-2.7-1 2.7-1z"/><path d="M4.2 10.4l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6z"/></Icon>,
};

const links=[
  ['/', 'Overview', icons.overview],
  ['/explore', 'Explore', icons.explore],
  ['/categories', 'Categories', icons.categories],
  ['/hidden-gems', 'Hidden Gems', icons.gems],
  ['/compare', 'Compare', icons.compare],
  ['/for-you', 'For You', icons.foryou],
  ['/research', 'My Research', icons.research],
  ['/intelligence', 'Intelligence', icons.intelligence],
  ['/rankings', 'Rankings', icons.rankings],
  ['/ai-researcher', 'AI Researcher', icons.ai],
];

export default function Nav(){
  const pathname=usePathname()||'/';
  const [open,setOpen]=useState(false);
  const isActive=href=>href==='/'?pathname==='/':pathname.startsWith(href);

  return (
    <aside className="side">
      <Link href="/" className="brand" onClick={()=>setOpen(false)}>
        <div className="mark">A</div>
        <div className="brandtext"><b>BharatCode Atlas</b><span>Build League intelligence</span></div>
      </Link>

      <button type="button" className="menubtn" aria-expanded={open} aria-label="Toggle navigation"
        onClick={()=>setOpen(o=>!o)}>
        <Icon>{open?<path d="M3.5 3.5l9 9M12.5 3.5l-9 9"/>:<path d="M2.5 5h11M2.5 8h11M2.5 11h11"/>}</Icon>
      </button>

      {open&&<button type="button" className="backdrop" aria-label="Close navigation" onClick={()=>setOpen(false)}/>}

      <nav className={'nav'+(open?' open':'')} aria-label="Atlas navigation">
        {links.map(([href,label,icon])=>{
          const active=isActive(href);
          return (
            <Link key={href} href={href} className={'navlink'+(active?' active':'')}
              aria-current={active?'page':undefined} onClick={()=>setOpen(false)}>
              {icon}<span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sidefoot">
        <b>294 published projects</b>
        Atlas scores are derived research signals, not official verdicts.
      </div>
    </aside>
  );
}
