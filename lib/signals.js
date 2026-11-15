// Pure scoring and classification helpers. No data loading and no framework
// imports, so everything here can be unit-tested directly in Node.

export const SIGNALS = {
  agents: { label: 'AI Agents', terms: ['agent', 'autonomous', 'orchestrat'], reason: 'Project text mentions agent, autonomous, or orchestration concepts.' },
  rag: { label: 'RAG / Retrieval', terms: ['rag', 'retrieval', 'vector database', 'embedding'], reason: 'Project text mentions retrieval, RAG, embeddings, or vector databases.' },
  security: { label: 'Security', terms: ['security', 'cyber', 'fraud', 'privacy', 'threat'], reason: 'Project text mentions security, cyber, fraud, privacy, or threats.' },
  voice: { label: 'Voice / Audio', terms: ['voice', 'speech', 'audio', 'stt', 'tts'], reason: 'Project text mentions voice, speech, audio, STT, or TTS.' },
  vision: { label: 'Vision / OCR', terms: ['vision', 'ocr', 'image', 'video', 'computer vision'], reason: 'Project text mentions visual, OCR, image, or video processing.' },
  governance: { label: 'Governance / Compliance', terms: ['governance', 'compliance', 'policy', 'audit'], reason: 'Project text mentions governance, compliance, policy, or audit.' },
  civic: { label: 'Civic / Public', terms: ['civic', 'municipal', 'government', 'public service', 'urban'], reason: 'Project text mentions civic, government, public-service, municipal, or urban use cases.' },
  devtools: { label: 'Developer Tools', terms: ['developer', 'codebase', 'github', 'repository', 'open-source', 'dev tool', 'software development'], reason: 'Project text mentions developer workflows, codebases, repositories, or software development.' }
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Word-start matching: "agent" matches "agents"/"agentic" but "rag" does not
// match "fragile" and "voice" does not match "invoice". Very short terms must
// match a whole word.
const startRegexCache = new Map();
export function hasTerm(text, term) {
  let re = startRegexCache.get(term);
  if (!re) {
    re = new RegExp('\\b' + escapeRegExp(term) + (term.length <= 3 ? '\\b' : ''), 'i');
    startRegexCache.set(term, re);
  }
  return re.test(text);
}

// Whole-word matching with an optional plural, used for free text typed by users.
const wordRegexCache = new Map();
export function hasWord(text, term) {
  let re = wordRegexCache.get(term);
  if (!re) {
    re = new RegExp('\\b' + escapeRegExp(term) + '(?:s|es)?\\b', 'i');
    wordRegexCache.set(term, re);
  }
  return re.test(text);
}

const projectText = (p) => ((p.project_name || '') + ' ' + (p.description || '')).toLowerCase();

export function classify(p) {
  const text = projectText(p);
  return Object.fromEntries(
    Object.entries(SIGNALS).map(([key, signal]) => [key, signal.terms.some((term) => hasTerm(text, term))])
  );
}

const countSignals = (p) => Object.values(classify(p)).filter(Boolean).length;

export function signalDetails(p) {
  return Object.entries(classify(p))
    .filter(([, active]) => active)
    .map(([key]) => ({ key, label: SIGNALS[key].label, reason: SIGNALS[key].reason }));
}

export function relevance(p) {
  return Math.min(100, 20 + countSignals(p) * 9 + (p.github_stars > 20 ? 8 : 0) + (p.votes > 20 ? 5 : 0));
}

export function hiddenGem(p) {
  const popularityPenalty = Math.max(0, 35 - Math.min(35, p.votes * 0.7));
  const technicalSignal = countSignals(p) * 7;
  const community = Math.min(25, p.community_score * 0.25);
  const stars = Math.min(20, p.github_stars * 0.45);
  return Math.min(100, Math.round(popularityPenalty + technicalSignal + community + stars));
}

export function technicalInterest(p) {
  const evidence = ((p.description || '').length > 120 ? 10 : 0) + (p.github_stars > 5 ? 5 : 0);
  return Math.min(100, Math.round(countSignals(p) * 10 + evidence));
}

export function whyHiddenGem(p) {
  const reasons = [];
  if (p.votes < 10) reasons.push('low vote volume');
  if (p.github_stars < 20) reasons.push('limited GitHub popularity');
  const signals = signalDetails(p).map((x) => x.label);
  if (signals.length) reasons.push('strong ' + signals.slice(0, 2).join(' + ') + ' signal');
  if (p.community_score >= 70) reasons.push('solid community score');
  return reasons.length ? reasons.join(' · ') : 'mixed popularity and technical signals';
}

// Without repository evidence only the description-derived dimensions can be
// true. The engineering dimensions (frontend, backend, ...) need a repository.
export function architectureProfile(project, repository = null) {
  const sourceSignals = signalDetails(project);
  const repoTech = repository?.technologies || [];
  const repoArchitecture = repository?.architecture || [];
  const combined = new Set([...sourceSignals.map((x) => x.label), ...repoTech, ...repoArchitecture]);

  const dimensions = {
    agents: combined.has('AI Agents') || combined.has('Agents / Orchestration'),
    rag: combined.has('RAG / Retrieval'),
    security: combined.has('Security') || combined.has('Authentication'),
    developerTools: combined.has('Developer Tools'),
    voice: combined.has('Voice / Audio'),
    vision: combined.has('Vision / OCR'),
    governance: combined.has('Governance / Compliance'),
    civic: combined.has('Civic / Public'),
    ai: combined.has('AI / LLM') || combined.has('AI Agents') || combined.has('RAG / Retrieval'),
    frontend: combined.has('Frontend'),
    backend: combined.has('Backend / API'),
    database: combined.has('Database'),
    deployment: combined.has('Deployment'),
    testing: combined.has('Testing'),
    observability: combined.has('Observability')
  };

  const evidence = [];
  if (sourceSignals.length) evidence.push('BharatCode project description');
  if (repository?.technologies?.length) evidence.push('GitHub repository technology signals');
  if (repository?.architecture?.length) evidence.push('GitHub repository architecture signals');

  return {
    dimensions,
    technologies: repoTech,
    architecture: repoArchitecture,
    sourceSignals,
    evidence,
    confidence: repository?.ok ? 'repository + source evidence' : 'source-only evidence'
  };
}

export function researchScore(project, repository = null) {
  const { dimensions: d } = architectureProfile(project, repository);
  const technical = [d.agents, d.rag, d.security, d.developerTools, d.voice, d.vision, d.ai].filter(Boolean).length;
  const engineering = [d.frontend, d.backend, d.database, d.deployment, d.testing, d.observability].filter(Boolean).length;

  return Math.min(100, Math.round(
    technical * 9 +
    engineering * 4 +
    Math.min(15, project.community_score * 0.15) +
    Math.min(10, project.github_stars * 0.2)
  ));
}

const INTEREST_GROUPS = {
  agents: ['agent', 'langchain', 'langgraph', 'mcp', 'tool calling', 'orchestration', 'workflow'],
  rag: ['rag', 'retrieval', 'embedding', 'vector', 'llamaindex', 'pinecone', 'qdrant', 'chroma'],
  security: ['security', 'auth', 'authentication', 'oauth', 'jwt', 'privacy', 'fraud'],
  devtools: ['developer', 'devtool', 'developer tools', 'code', 'repository', 'github', 'cli', 'sdk'],
  voice: ['voice', 'speech', 'audio', 'stt', 'tts', 'call', 'conversation'],
  vision: ['vision', 'ocr', 'image', 'computer vision', 'multimodal'],
  governance: ['governance', 'compliance', 'audit', 'policy', 'risk', 'regulation'],
  civic: ['civic', 'government', 'municipal', 'public', 'urban', 'citizen'],
  ai: ['ai', 'artificial intelligence', 'llm', 'generative', 'gemini', 'openai', 'model']
};

export function buildUserProfile({ githubData = null, building = '', interests = '' } = {}) {
  const corpus = [
    building,
    interests,
    githubData?.bio || '',
    ...(githubData?.repos || []).flatMap((r) => [r.name, r.description || '', r.language || '', ...(r.topics || [])])
  ].join(' ').toLowerCase();

  const profile = {};
  for (const [key, terms] of Object.entries(INTEREST_GROUPS)) {
    profile[key] = terms.some((term) => hasWord(corpus, term));
  }

  const detected = [...new Set([
    ...(githubData?.repos || []).map((r) => r.language).filter(Boolean),
    ...(githubData?.repos || []).flatMap((r) => r.topics || [])
  ])].slice(0, 12);

  return { profile, detected, corpus };
}

export const INTEREST_LABELS = { ...Object.fromEntries(Object.entries(SIGNALS).map(([k, v]) => [k, v.label])), ai: 'AI / LLM' };

const AI_TEXT = /\b(ai|llm|llms|gpt|gemini|generative|machine learning|chatbot|copilot)\b/i;

// Score = how much of what the user cares about the project covers. Bonuses for
// stars and community score apply only when there is at least one match, so a
// project with no overlap is never recommended. "ai" is a user interest with no
// single description signal: it matches AI wording or an agent/RAG project.
export function userOpportunity(project, userProfile) {
  const profile = userProfile?.profile || {};
  const matchable = { ...classify(project) };
  matchable.ai = AI_TEXT.test(projectText(project)) || matchable.agents || matchable.rag;
  const wanted = Object.keys(INTEREST_LABELS).filter((key) => profile[key]);
  const matches = wanted.filter((key) => matchable[key]);

  let score = 0;
  if (matches.length) {
    score = Math.round(60 * matches.length / wanted.length)
      + Math.min(matches.length, 3) * 8
      + (project.github_stars > 10 ? 4 : 0)
      + (project.community_score > 70 ? 4 : 0);
  }
  score = Math.min(100, score);

  const reasons = [];
  if (matches.length) reasons.push('matches ' + matches.map((k) => INTEREST_LABELS[k]).slice(0, 3).join(' + ') + ' interests');
  if (matches.length && userProfile?.detected?.length) reasons.push('your profile mentions ' + userProfile.detected.slice(0, 3).join(', '));
  return { score, reasons };
}

export const STRONG_MATCH_SCORE = 55;
