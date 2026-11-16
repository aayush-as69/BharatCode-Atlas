import Nav from '@/components/Nav';

export default function Loading(){
  return <div className="shell"><Nav/><main id="main" className="main" aria-busy="true">
    <div role="status">
      <div className="eyebrow">Loading</div>
      <p className="sub">Loading Atlas…</p>
    </div>
  </main></div>;
}
