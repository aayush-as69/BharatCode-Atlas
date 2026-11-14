import {getProjects,userOpportunity,buildUserProfile} from '@/lib/source';

export async function POST(request){
  try{
    const body=await request.json();
    const github=String(body.github||'').trim();
    const building=String(body.building||'').trim();
    const interests=Array.isArray(body.interests)?body.interests:[];
    let githubData=null;

    if(github){
      const match=github.match(/github\.com\/([^/]+)/i);
      const login=(match?match[1]:github.replace(/^@/,'')).trim();
      if(!login) return Response.json({error:'Enter a valid GitHub username or profile URL.'},{status:400});
      const token=process.env.GITHUB_TOKEN;
      const headers={accept:'application/vnd.github+json',...(token?{authorization:'Bearer '+token}:{})};
      const profileRes=await fetch('https://api.github.com/users/'+encodeURIComponent(login),{headers});
      if(!profileRes.ok) return Response.json({error:'GitHub profile not found.'},{status:404});
      const profile=await profileRes.json();
      const reposRes=await fetch('https://api.github.com/users/'+encodeURIComponent(login)+'/repos?per_page=30&sort=updated',{headers});
      const repos=reposRes.ok?await reposRes.json():[];
      githubData={login:profile.login,name:profile.name,bio:profile.bio,repos:repos.map(r=>({name:r.name,description:r.description,language:r.language,topics:r.topics||[]}))};
    }

    const userProfile=buildUserProfile({githubData,building,interests:interests.join(' ')});
    const projects=await getProjects();
    const recommendations=projects.map(project=>({project,...userOpportunity(project,userProfile)}))
      .filter(x=>x.score>0)
      .sort((a,b)=>b.score-a.score||b.project.community_score-a.project.community_score)
      .slice(0,12);

    const active=Object.entries(userProfile.profile).filter(([,v])=>v).map(([k])=>k.replace(/([A-Z])/g,' $1'));
    return Response.json({
      github:githubData,
      profileSummary:active.length?'Atlas detected interest in '+active.slice(0,5).join(', ')+'.':'Atlas will use your project description and selected interests.',
      detected:userProfile.detected,
      recommendations
    });
  }catch(error){
    return Response.json({error:'Could not build your profile. Please try again.'},{status:500});
  }
}