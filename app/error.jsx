'use client';

export default function ErrorBoundary({reset}){
  // The error message is deliberately not rendered: it can contain internals.
  return <main className="main" role="alert">
    <div className="eyebrow">Something went wrong</div>
    <h1 className="title">This page could not be loaded.</h1>
    <p className="sub">Atlas hit an unexpected problem. Your saved research is not affected. Try again, or return to the overview.</p>
    <div style={{display:'flex',gap:8,marginTop:20,flexWrap:'wrap'}}>
      <button className="button" type="button" onClick={()=>reset()}>Try again</button>
      <a className="button" href="/">Back to overview</a>
    </div>
  </main>;
}
