import Nav from '@/components/Nav';

export default function Loading(){
  return <div className="shell"><Nav/><main id="main" className="main">
    <div className="skel skel-line" style={{width:210}}/>
    <div className="skel skel-title" style={{width:460,margin:'18px 0 14px'}}/>
    <div className="skel skel-line" style={{width:'65%'}}/>
    <div className="stats">
      {[0,1,2].map(i=><div className="stat" key={i}>
        <div className="skel skel-num"/>
        <div className="skel skel-line" style={{width:'55%',marginTop:10}}/>
      </div>)}
    </div>
    <div className="panel section">
      <div className="skel skel-line" style={{width:'35%'}}/>
      <div className="grid" style={{marginTop:16}}>
        {[0,1,2,3,4,5].map(i=><div className="skel skel-block" key={i}/>)}
      </div>
    </div>
  </main></div>;
}
