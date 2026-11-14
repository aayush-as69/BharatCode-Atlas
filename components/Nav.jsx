import Link from 'next/link';

export default function Nav(){
  return (
    <aside className="side">
      <div className="brand">
        <div className="mark">A</div>
        <div><b>BharatCode Atlas</b><span>Build League intelligence</span></div>
      </div>
      <nav className="nav" aria-label="Atlas navigation">
        <Link href="/">Overview</Link>
        <Link href="/explore">Explore 294</Link>
        <Link href="/categories">Categories</Link>
        <Link href="/hidden-gems">Hidden Gems</Link>
        <Link href="/compare">Compare</Link>
        <Link href="/research">My Research</Link>
        <Link href="/ai-researcher">AI Researcher</Link>
      </nav>
      <div style={{marginTop:28,padding:'12px',borderTop:'1px solid var(--line)',color:'var(--muted)',fontSize:10,lineHeight:1.5}}>
        <b style={{color:'var(--text)'}}>Source</b><br/>
        294 published Build League projects. Atlas scores are derived research signals.
      </div>
    </aside>
  );
}