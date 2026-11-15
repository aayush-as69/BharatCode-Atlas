// Retrieval for the AI Researcher. Pure functions so the behaviour is testable.

const STOPWORDS = new Set((
  'a an and are about all any as at be been being but by can could do does find for from give had has have how i if in into is it its ' +
  'list me more most my of on or our show tell than that the their them there these they this those to us want was we were what when ' +
  'where which who why will with would you your please project projects related relevant strongest strong best top signal signals ' +
  'worth investigating investigate inspire ideas idea built build using use used similar like also compare comparing'
).split(/\s+/));

// Short technical terms that must survive tokenization (matched as whole words).
const SHORT_TERMS = new Set(['rag', 'ai', 'llm', 'ocr', 'stt', 'tts', 'nlp', 'mcp', 'iot', 'api', 'ui', 'ml']);

const SYNONYMS = {
  rag: ['retrieval', 'embedding', 'vector'],
  retrieval: ['rag', 'embedding'],
  voice: ['speech', 'audio'],
  speech: ['voice'],
  security: ['cyber', 'fraud'],
  fraud: ['scam'],
  ocr: ['vision']
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function normalizeToken(token) {
  if (token.length > 4 && token.endsWith('s') && !token.endsWith('ss')) return token.slice(0, -1);
  return token;
}

export function tokenize(text) {
  const words = String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9+#\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter(Boolean);

  const tokens = [];
  for (const word of words) {
    if (STOPWORDS.has(word)) continue;
    if (word.length < 3 && !SHORT_TERMS.has(word)) continue;
    tokens.push(normalizeToken(word));
  }
  return [...new Set(tokens)];
}

function matcher(token) {
  const body = escapeRegExp(token);
  return new RegExp('\\b' + body + (SHORT_TERMS.has(token) ? '\\b' : ''), 'i');
}

export function searchProjects(projects, question, { limit = 12 } = {}) {
  const tokens = tokenize(question);
  if (!tokens.length) return [];

  const weighted = new Map(tokens.map((token) => [token, 1]));
  for (const token of tokens) {
    for (const synonym of SYNONYMS[token] || []) {
      if (!weighted.has(synonym)) weighted.set(synonym, 0.5);
    }
  }
  const matchers = [...weighted].map(([token, weight]) => ({ token, weight, re: matcher(token) }));

  const scored = [];
  for (const project of projects) {
    const name = project.project_name || '';
    const description = project.description || '';
    let score = 0;
    let distinct = 0;
    for (const { weight, re } of matchers) {
      let hit = 0;
      if (re.test(name)) hit += 3 * weight;
      if (re.test(description)) hit += weight;
      if (hit) {
        score += hit;
        distinct += 1;
      }
    }
    if (score > 0) scored.push({ project, score: score + distinct * 0.5 });
  }

  scored.sort((a, b) => b.score - a.score || a.project.rank - b.project.rank);
  return scored.slice(0, limit).map((entry) => entry.project);
}
