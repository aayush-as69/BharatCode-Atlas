import {getProjects,userOpportunity,buildUserProfile} from '@/lib/source';

export async function POST(request){
  try{
    const body=await request.json();
    const github=String(body.github||'').trim();
    const githubProfiles=Array.isArray(body.githubProfiles)?body.githubProfiles.map(String).map(x=>x.trim()).filter(Boolean):[];
    const profiles=[...new Set([github,...githubProfiles].filter(Boolean))];
    const building=String(body.building||'').trim();
    const interests=Array.isArray(body.interests)?body.interests:[];
    let githubData=null;

    if(profiles.length){
      const token=process.env.GITHUB_TOKEN;
      const headers={accept:'application/vnd.github+json',...(token?{authorization:'Bearer '+token}:{})};
      const collected=[];
      let firstProfile=null;
      for(const value of profiles.slice(0,5)){
        const match=value.match(/github\.com\/([^/]+)/i);
        const login=(match?match[1]:value.replace(/^@/,'')).trim();
        if(!login) continue;
        const profileRes=await fetch('https://api.github.com/users/'+encodeURIComponent(login),{headers});
        if(!profileRes.ok) continue;
        const profile=await profileRes.json();
        if(!firstProfile) firstProfile=profile;
        const reposRes=await fetch('https://api.github.com/users/'+encodeURIComponent(login)+'/repos?per_page=30&sort=updated',{headers});
        const repos=reposRes.ok?await reposRes.json():[];
        collected.push(...repos.map(r=>({name:r.name,description:r.description,language:r.language,topics:r.topics||[]})));
      }
      if(!firstProfile && profiles.length) return Response.json({error:'No valid public GitHub profiles were found.'},{status:404});
      githubData={login:firstProfile.login,name:firstProfile.name,bio:firstProfile.bio,repos:collected,profiles:profiles.slice(0,5)};
    }

    const userProfile=buildUserProfile({githubData,building,interests:interests.join(' ')});
    const projects=await getProjects();
    const recommendations=projects.map(project=>({project,...userOpportunity(project,userProfile)}))
      .filter(x=>x.score>0)
      .sort((a,b)=>b.score-a.score||b.project.community_score-a.project.community_score)
      .slice(0,18);

    const strongMatches=recommendations.filter(x=>x.score>=55).slice(0,6);
    const worthExploring=recommendations.filter(x=>x.score<55).slice(0,8);
    const landscape={};
    for(const r of recommendations){
      for(const reason of r.reasons||[]){
        const key=reason.split(' ')[0];
        landscape[key]=(landscape[key]||0)+1;
      }
    }

    const active=Object.entries(userProfile.profile).filter(([,v])=>v).map(([k])=>k.replace(/([A-Z])/g,' $1'));
    return Response.json({
      github:githubData,
      profileSummary:active.length?'Atlas detected interest in '+active.slice(0,5).join(', ')+'.':'Atlas will use your project description and selected interests.',
      detected:userProfile.detected,
      recommendations,
      strongMatches,
      worthExploring,
      landscape
    });
  }catch(error){
    return Response.json({error:'Could not build your profile. Please try again.'},{status:500});
  }
}