import test from 'node:test';
import assert from 'node:assert/strict';
import {extractQueryTerms,retrieveProjects} from '../lib/retrieval.js';

const fixture=[
  {rank:1,project_name:'GarageDoor IoT',description:'Smart garage opener with mobile app control and mqtt telemetry.',github_stars:50,votes:100,community_score:90},
  {rank:2,project_name:'RAGDesk',description:'Retrieval-augmented generation assistant with a vector database and embeddings for document search.',github_stars:30,votes:80,community_score:85},
  {rank:3,project_name:'VoiceFlow Agents',description:'Voice agents with speech recognition, TTS responses, and a retrieval layer over support documents.',github_stars:20,votes:60,community_score:70},
  {rank:4,project_name:'SecureScan OCR',description:'OCR pipeline that extracts text from scanned documents and flags fraud signals.',github_stars:10,votes:30,community_score:60},
  {rank:5,project_name:'BrandGuard',description:'Brand governance and compliance monitoring with audit trails and policy checks.',github_stars:5,votes:25,community_score:55},
  {rank:6,project_name:'DevToolKit',description:'Developer tool for codebase and repository research with an open-source SDK.',github_stars:8,votes:20,community_score:50}
];

test('extractQueryTerms keeps allowlisted short terms and drops stopwords',()=>{
  const terms=extractQueryTerms('Which projects have the strongest RAG signals?');
  assert.ok(terms.includes('rag'));
  assert.ok(!terms.includes('which'));
  assert.ok(!terms.includes('have'));
});

test('extractQueryTerms strips punctuation and normalizes',()=>{
  const terms=extractQueryTerms('Find projects related to voice agents and retrieval.');
  assert.deepStrictEqual(terms,['projects','voice','agents','retrieval']);
});

test('short non-allowlisted tokens are dropped',()=>{
  assert.deepStrictEqual(extractQueryTerms('do a lot of it'),[]);
});

test('word-boundary matching avoids substring false positives',()=>{
  const projects=retrieveProjects(fixture,'Which projects have the strongest RAG signals?');
  // "GarageDoor" contains "rag" as a substring but is not a RAG project.
  assert.ok(!projects.some(p=>p.project_name==='GarageDoor IoT'));
  assert.strictEqual(projects[0].project_name,'RAGDesk');
});

test('retrieval ranks by distinct term hits then rank',()=>{
  const projects=retrieveProjects(fixture,'Find projects related to voice agents and retrieval.');
  // VoiceFlow Agents hits voice + agents + retrieval (3 terms) — should rank first.
  assert.strictEqual(projects[0].project_name,'VoiceFlow Agents');
  assert.ok(projects.length<=12);
});

test('retrieval returns mostly on-topic rows for the example questions',()=>{
  const q1=retrieveProjects(fixture,'Which projects have the strongest RAG signals?');
  assert.ok(q1.some(p=>p.project_name==='RAGDesk'));
  assert.ok(!q1.some(p=>p.project_name==='GarageDoor IoT'));
  const q2=retrieveProjects(fixture,'What projects could inspire BrandGuard?');
  assert.ok(q2.some(p=>p.project_name==='BrandGuard'));
  const q4=retrieveProjects(fixture,'Which developer-tool projects are worth investigating?');
  assert.ok(q4.some(p=>p.project_name==='DevToolKit'));
});

test('retrieval returns an empty list when no terms survive',()=>{
  assert.deepStrictEqual(retrieveProjects(fixture,'???'),[]);
});

test('retrieval caps results at the requested limit',()=>{
  const many=Array.from({length:40},(_,i)=>({rank:i+1,project_name:'Voice project '+(i+1),description:'voice agent research '+(i+1)}));
  assert.strictEqual(retrieveProjects(many,'voice agents',12).length,12);
});
