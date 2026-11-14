import Nav from '@/components/Nav';

export default function Loading(){
  return <div className="shell"><Nav/><main className="main">
    <div className="skel skel-line" style={{width:150}}/>
    <div className="skel skel-title" style={{width:320,margin:'18px 0 14px'}}/>
    <div className="skel skel-line" style={{width:'72%'}}/>
    <div className="kpis">
      {[0,1,2,3].map(i=><div className="kpi" key={i}>
        <div className="skel skel-num"/>
        <div className="skel skel-line" style={{width:'60%',marginTop:10}}/>
      </div>)}
    </div>
    <div className="two section">
      <div className="panel"><div className="skel skel-line" style={{width:'40%'}}/><div className="skel skel-block" style={{marginTop:16}}/></div>
      <div className="panel"><div className="skel skel-line" style={{width:'40%'}}/><div className="skel skel-block" style={{marginTop:16}}/></div>
    </div>
  </main></div>;
}
