import Nav from '@/components/Nav';

export default function Loading(){
  return <div className="shell"><Nav/><main className="main">
    <div className="skel skel-line" style={{width:190}}/>
    <div className="skel skel-title" style={{width:300,margin:'18px 0 14px'}}/>
    <div className="skel skel-line" style={{width:'70%'}}/>
    <div className="panel section">
      <div className="skel skel-line" style={{width:'30%'}}/>
      <div className="skel skel-block" style={{marginTop:16,height:150}}/>
    </div>
    <div className="panel section">
      <div className="skel skel-line" style={{width:'30%'}}/>
      <div className="skel skel-block" style={{marginTop:16,height:260}}/>
    </div>
  </main></div>;
}
