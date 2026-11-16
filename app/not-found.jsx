import Link from 'next/link';
import Nav from '@/components/Nav';

export const metadata={title:'Not found · BharatCode Atlas'};

export default function NotFound(){
  return <div className="shell"><Nav/><main className="main">
    <div className="empty section" style={{marginTop:72}}>
      <div className="eyebrow">Error 404</div>
      <h1 className="title" style={{fontSize:36}}>Nothing here.</h1>
      <p className="sub">The project or page you asked for does not exist in the Atlas dataset. It may have been removed after a data refresh.</p>
      <Link className="button primary" href="/explore">Back to explorer</Link>
    </div>
  </main></div>;
}
