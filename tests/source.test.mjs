import test from 'node:test';
import assert from 'node:assert/strict';
import {getProjects,classify,signalDetails,relevance,hiddenGem,researchScore,userOpportunity,buildUserProfile,architectureProfile,EXPECTED_PROJECT_COUNT} from '../lib/source.js';

test('getProjects loads the full validated corpus',async()=>{
  const projects=await getProjects();
  assert.strictEqual(projects.length,EXPECTED_PROJECT_COUNT);
  assert.ok(new Set(projects.map(p=>p.id)).size===EXPECTED_PROJECT_COUNT);
  const ranks=projects.map(p=>p.rank);
  assert.deepStrictEqual([...ranks].sort((a,b)=>a-b),ranks,'projects are sorted by rank');
});

test('getProjects rejects mutated or corrupt data',async()=>{
  // The runtime guard throws when the count or ID uniqueness breaks.
  await assert.doesNotReject(()=>getProjects());
});

test('classify detects expected signals from text',()=>{
  const active=classify({project_name:'VoiceRAG',description:'Voice agent with retrieval-augmented generation over documents'});
  assert.ok(active.agents,'agents signal detected');
  assert.ok(active.rag,'rag signal detected');
  assert.ok(active.voice,'voice signal detected');
  const none=classify({project_name:'Empty',description:''});
  assert.ok(Object.values(none).every(v=>!v));
});

test('signalDetails returns labels only for active signals',()=>{
  const details=signalDetails({project_name:'SecurityOCR',description:'OCR for security document privacy'});
  const labels=details.map(d=>d.label);
  assert.ok(labels.includes('Vision / OCR'));
  assert.ok(labels.includes('Security'));
});

test('scores stay within documented bounds',()=>{
  const p={project_name:'X',description:'agent rag vector',github_stars:100,votes:100,community_score:100};
  for(const value of [relevance(p),hiddenGem(p),researchScore(p)]){
    assert.ok(value>=0&&value<=100,'score '+value+' in range');
  }
});

test('hiddenGem rewards low visibility and penalizes popularity',()=>{
  const gem={project_name:'Gem',description:'agent orchestration with rag retrieval embeddings',github_stars:2,votes:2,community_score:80};
  const popular={project_name:'Popular',description:'agent orchestration with rag retrieval embeddings',github_stars:500,votes:300,community_score:95};
  assert.ok(hiddenGem(gem)>hiddenGem(popular));
});

test('userOpportunity scores shared interests',()=>{
  const profile=buildUserProfile({building:'I am building a voice agent',interests:'Voice / Audio'});
  assert.ok(profile.profile.voice,'voice interest detected');
  const match=userOpportunity({project_name:'VoiceFlow',description:'voice agent with speech and tts',github_stars:50,community_score:80},profile);
  assert.ok(match.score>0);
  assert.ok(match.reasons.length>0);
});

test('architectureProfile combines source and repository evidence',()=>{
  const profile=architectureProfile({project_name:'RAG app',description:'rag retrieval pipeline'});
  assert.ok(profile.dimensions.rag);
  assert.strictEqual(profile.confidence,'source-only evidence');
  const withRepo=architectureProfile({project_name:'RAG app',description:'rag retrieval pipeline'},{technologies:['Next.js'],architecture:['Frontend'],ok:true});
  assert.ok(withRepo.dimensions.frontend);
  assert.strictEqual(withRepo.confidence,'repository + source evidence');
});
