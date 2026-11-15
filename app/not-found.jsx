import Link from 'next/link';
import Nav from '@/components/Nav';

export const metadata={title:'Not found · BharatCode Atlas'};

export default function NotFound(){
  return <div className="shell"><Nav/><main className="main">
    <div className="eyebrow">404</div>
    <h1 className="title">We could not find that page.</h1>
    <p className="sub">The project or page you asked for does not exist in the Atlas dataset. It may have been removed after a data refresh.</p>
    <div style={{display:'flex',gap:8,marginTop:20,flexWrap:'wrap'}}>
      <Link className="button" href="/explore">Browse all projects →</Link>
      <Link className="button" href="/">Back to overview</Link>
    </div>
  </main></div>;
}
