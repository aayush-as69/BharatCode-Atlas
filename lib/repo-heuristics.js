// Repository signal detection. One rule table drives technology signals,
// architecture signals and their evidence, so they cannot drift apart.
//
// Evidence order of trust: dependency manifests > file paths > README words.
// Matching is path-segment / exact-dependency based, never raw substring, so
// "Authors" in a README is not "Authentication" and a CI workflow file is not
// "Agents / Orchestration".

const dep = (...names) => names;

export const TECH_RULES = [
  { name: 'Next.js', deps: dep('next'), paths: [/(^|\/)next\.config\.(js|mjs|cjs|ts)$/] },
  { name: 'React', deps: dep('react', 'react-dom') },
  { name: 'Node.js', paths: [/(^|\/)package\.json$/] },
  { name: 'Python', paths: [/(^|\/)(requirements\.txt|pyproject\.toml|setup\.py|Pipfile)$/] },
  { name: 'FastAPI', deps: dep('fastapi') },
  { name: 'Flask', deps: dep('flask') },
  { name: 'Express', deps: dep('express') },
  { name: 'MongoDB', deps: dep('mongoose', 'mongodb', 'pymongo', 'motor') },
  { name: 'PostgreSQL', deps: dep('pg', 'postgres', 'psycopg', 'psycopg2', 'psycopg2-binary', 'asyncpg', 'pgvector') },
  { name: 'Supabase', deps: dep('@supabase/*', 'supabase') },
  { name: 'Firebase', deps: dep('firebase', 'firebase-admin', '@firebase/*') },
  { name: 'Tailwind CSS', deps: dep('tailwindcss'), paths: [/(^|\/)tailwind\.config\.(js|cjs|mjs|ts)$/] },
  { name: 'LangChain', deps: dep('langchain', 'langchain-*', '@langchain/*') },
  { name: 'LlamaIndex', deps: dep('llama-index', 'llama-index-*', 'llamaindex') },
  { name: 'OpenAI', deps: dep('openai') },
  { name: 'Gemini', deps: dep('@google/generative-ai', '@google/genai', 'google-generativeai', 'google-genai') },
  { name: 'Vector DB', deps: dep('chromadb', 'pinecone', 'pinecone-client', '@pinecone-database/pinecone', 'qdrant-client', '@qdrant/*', 'weaviate-client', 'pymilvus', 'pgvector', 'faiss-cpu', 'faiss-gpu') },
  { name: 'Docker', paths: [/(^|\/)Dockerfile(\.[\w-]+)?$/i, /(^|\/)docker-compose(\.[\w-]+)?\.ya?ml$/i] },
  { name: 'MCP', deps: dep('@modelcontextprotocol/*', 'mcp', 'fastmcp'), readme: ['model context protocol', 'mcp server'] }
];

export const ARCHITECTURE_RULES = [
  {
    name: 'Frontend',
    deps: dep('react', 'react-dom', 'vue', 'svelte', 'next', 'nuxt', '@angular/core', 'streamlit', 'gradio'),
    paths: [/(^|\/)(components|pages|views)\//, /(^|\/)(vite|next|nuxt|svelte|astro)\.config\./, /\.(jsx|tsx|vue|svelte)$/, /(^|\/)index\.html$/]
  },
  {
    name: 'Backend / API',
    deps: dep('express', 'fastapi', 'flask', 'koa', 'fastify', 'django', 'hono', '@nestjs/core', 'uvicorn', 'gunicorn'),
    paths: [/(^|\/)(api|routes|routers|controllers)\//, /(^|\/)(server|api)\.(js|mjs|cjs|ts|py)$/]
  },
  {
    name: 'Database',
    deps: dep('mongoose', 'mongodb', 'pymongo', 'prisma', '@prisma/client', 'sqlalchemy', 'pg', 'psycopg2', 'psycopg2-binary', '@supabase/*', 'supabase', 'sequelize', 'typeorm', 'drizzle-orm', 'firebase', 'firebase-admin', 'redis', 'sqlite3', 'better-sqlite3'),
    paths: [/(^|\/)(models|migrations|prisma)\//, /(^|\/)schema\.(prisma|sql)$/, /\.sql$/]
  },
  {
    name: 'AI / LLM',
    deps: dep('openai', '@google/generative-ai', '@google/genai', 'google-generativeai', 'google-genai', 'anthropic', '@anthropic-ai/sdk', 'langchain', 'langchain-*', '@langchain/*', 'llama-index', 'llama-index-*', 'transformers', 'ollama', 'groq', 'groq-sdk', 'cohere', 'mistralai', 'together'),
    readme: ['llm', 'openai', 'gemini', 'anthropic', 'large language model']
  },
  {
    name: 'RAG / Retrieval',
    deps: dep('chromadb', 'pinecone', 'pinecone-client', '@pinecone-database/pinecone', 'qdrant-client', '@qdrant/*', 'weaviate-client', 'pgvector', 'faiss-cpu', 'faiss-gpu', 'sentence-transformers', 'llama-index', 'llama-index-*'),
    paths: [/(^|\/)(rag|retriev\w*|embeddings?|vectorstores?)(\/|\.|$)/i],
    readme: ['rag', 'retrieval-augmented', 'retrieval augmented', 'vector database', 'embeddings']
  },
  {
    name: 'Agents / Orchestration',
    deps: dep('langgraph', 'crewai', 'autogen', 'pyautogen', 'openai-agents', '@modelcontextprotocol/*', 'mcp', 'fastmcp'),
    paths: [/(^|\/)agents?(\/|\.)/i],
    readme: ['multi-agent', 'multi agent', 'agentic', 'langgraph', 'crewai', 'mcp server']
  },
  {
    name: 'Authentication',
    deps: dep('next-auth', '@auth/*', '@clerk/*', 'passport', 'passport-*', 'jsonwebtoken', 'bcrypt', 'bcryptjs', 'passlib', 'authlib', 'pyjwt', 'python-jose', '@supabase/auth-helpers-nextjs'),
    paths: [/(^|\/)auth(entication)?(\/|\.[a-z]+$)/i]
  },
  {
    name: 'Deployment',
    paths: [/(^|\/)Dockerfile(\.[\w-]+)?$/i, /(^|\/)docker-compose(\.[\w-]+)?\.ya?ml$/i, /(^|\/)vercel\.json$/, /(^|\/)render\.ya?ml$/, /(^|\/)railway\.(json|toml)$/, /(^|\/)fly\.toml$/, /(^|\/)netlify\.toml$/, /(^|\/)Procfile$/, /(^|\/)serverless\.ya?ml$/]
  },
  {
    name: 'Testing',
    deps: dep('jest', 'vitest', 'pytest', 'mocha', '@playwright/test', 'cypress'),
    paths: [/(^|\/)(tests?|__tests__|spec)\//, /\.(test|spec)\.[cm]?[jt]sx?$/, /(^|\/)test_[^/]+\.py$/, /_test\.py$/, /(^|\/)(jest|vitest|playwright)\.config\./, /(^|\/)(pytest\.ini|cypress\.config\.[a-z]+)$/]
  },
  {
    name: 'Observability',
    deps: dep('@sentry/*', 'sentry-sdk', '@opentelemetry/*', 'opentelemetry-api', 'winston', 'pino', 'loguru', 'structlog', 'prom-client'),
    paths: [/(^|\/)(logging|logger|monitoring)\.(js|mjs|ts|py)$/]
  }
];

export const MANIFEST_NAMES = ['package.json', 'requirements.txt', 'pyproject.toml', 'go.mod', 'Cargo.toml'];

// ---------------------------------------------------------------- dependencies

const normalizeDep = (name) => String(name).toLowerCase().replace(/_/g, '-');

function depMatches(pattern, name) {
  const p = normalizeDep(pattern);
  if (p.endsWith('*')) return name.startsWith(p.slice(0, -1));
  return name === p;
}

export function parseDependencies(path, content) {
  const base = path.split('/').pop();
  const names = new Set();
  const text = String(content || '');

  if (base === 'package.json') {
    try {
      const json = JSON.parse(text);
      for (const key of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
        for (const name of Object.keys(json[key] || {})) names.add(normalizeDep(name));
      }
    } catch {
      for (const match of text.matchAll(/"((?:@[\w.-]+\/)?[\w.-]+)"\s*:\s*"[^"]*"/g)) names.add(normalizeDep(match[1]));
    }
  } else if (base === 'requirements.txt') {
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('-')) continue;
      const match = trimmed.match(/^([A-Za-z0-9][A-Za-z0-9._-]*)/);
      if (match) names.add(normalizeDep(match[1]));
    }
  } else if (base === 'pyproject.toml') {
    for (const match of text.matchAll(/["']([A-Za-z][A-Za-z0-9._-]*)(?:\[[^\]]*\])?\s*(?:[<>=!~;,]|["'])/g)) names.add(normalizeDep(match[1]));
    for (const match of text.matchAll(/^\s*([A-Za-z][A-Za-z0-9._-]*)\s*=\s*["{]/gm)) names.add(normalizeDep(match[1]));
  } else if (base === 'go.mod') {
    for (const match of text.matchAll(/^\s*(?:require\s+)?([\w.-]+\.[\w.-]+\/[\w./-]+)\s+v/gm)) names.add(match[1].toLowerCase());
  } else if (base === 'Cargo.toml') {
    for (const match of text.matchAll(/^\s*([A-Za-z][\w-]*)\s*=\s*(?:"|\{)/gm)) names.add(normalizeDep(match[1]));
  }
  return names;
}

// ------------------------------------------------------------------ detection

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function readmeHas(readme, term) {
  return new RegExp('(?<![a-z0-9])' + escapeRegExp(term) + '(?![a-z0-9])', 'i').test(readme);
}

export function detect(rules, { paths = [], readme = '', deps = new Set() } = {}) {
  const names = [];
  const evidence = {};
  for (const rule of rules) {
    const hits = [];
    for (const pattern of rule.deps || []) {
      for (const name of deps) {
        if (depMatches(pattern, name)) {
          hits.push('dependency: ' + name);
          break;
        }
      }
      if (hits.length >= 2) break;
    }
    for (const pattern of rule.paths || []) {
      const hit = paths.find((p) => pattern.test(p));
      if (hit) hits.push('path: ' + hit);
      if (hits.length >= 4) break;
    }
    for (const term of rule.readme || []) {
      if (hits.length >= 4) break;
      if (readme && readmeHas(readme, term)) hits.push('README: ' + term);
    }
    if (hits.length) {
      names.push(rule.name);
      evidence[rule.name] = hits.slice(0, 4);
    }
  }
  return { names, evidence };
}

export function detectAll(context) {
  const technologies = detect(TECH_RULES, context);
  const architecture = detect(ARCHITECTURE_RULES, context);
  return { technologies, architecture };
}

// -------------------------------------------------------------- file selection

const PRIORITY_FILE_PATTERNS = [
  /^package\.json$/, /^requirements\.txt$/, /^pyproject\.toml$/, /^Dockerfile$/i, /^docker-compose\.ya?ml$/i,
  /^vercel\.json$/, /^\.github\/workflows\/[^/]+\.ya?ml$/,
  /^(src\/)?(index|main|app|server)\.(js|mjs|ts|py)$/, /^app\/page\.(jsx|js|tsx)$/, /^src\/App\.(jsx|js|tsx)$/,
  /^api\/[^/]+\.(js|ts|py)$/, /^app\/api\/.+\/route\.(js|ts)$/
];

// Files whose content may be fetched and previewed. Entry/API source files are
// listed (role + size) but never fetched, because that is where hard-coded keys
// most often live.
const PREVIEWABLE = [/^package\.json$/, /^requirements\.txt$/, /^pyproject\.toml$/, /^Dockerfile$/i, /^docker-compose\.ya?ml$/i, /^vercel\.json$/, /^\.github\/workflows\/[^/]+\.ya?ml$/];

export function isPreviewable(path) {
  return PREVIEWABLE.some((pattern) => pattern.test(path));
}

export function selectPriorityFiles(paths, isBlocked, limit = 18) {
  return paths.filter((path) => PRIORITY_FILE_PATTERNS.some((pattern) => pattern.test(path)) && !isBlocked(path)).slice(0, limit);
}

export function selectManifests(paths, limit = 8) {
  const manifests = paths.filter((p) => MANIFEST_NAMES.includes(p.split('/').pop()));
  manifests.sort((a, b) => a.split('/').length - b.split('/').length || a.localeCompare(b));
  return manifests.slice(0, limit);
}

export function fileRole(path) {
  const p = path.toLowerCase();
  if (/(^|\/)(package\.json|requirements\.txt|pyproject\.toml)$/.test(p)) return 'Dependencies';
  if (/dockerfile|docker-compose|vercel\.json/.test(p)) return 'Deployment';
  if (p.startsWith('.github/workflows/')) return 'CI / automation';
  if (/(^|\/)(api|routes?)\//.test(p) || /(^|\/)server\.[a-z]+$/.test(p) || /\/route\.[a-z]+$/.test(p)) return 'API / backend';
  if (/^app\/page\.|^src\/app\.|^src\/app\/|(^|\/)(index|main|app)\.(js|mjs|ts|py)$/.test(p)) return 'Application entry';
  return 'Repository configuration';
}

export function buildFingerprint(sourceRoles, architectureEvidence) {
  const fingerprint = [];
  const byRole = (role) => sourceRoles.filter((f) => f.role === role).map((f) => f.path);
  const add = (layer, signal, evidence) => { if (evidence.length) fingerprint.push({ layer, signal, evidence }); };

  add('Application', 'Application entry point detected', byRole('Application entry'));
  add('API / backend', 'Backend or API entrypoint detected', byRole('API / backend'));
  add('Dependencies', 'Dependency manifest inspected', byRole('Dependencies'));
  add('Deployment', 'Container/deployment configuration detected', byRole('Deployment'));
  add('CI / automation', 'CI workflow detected', byRole('CI / automation'));
  add('Retrieval', 'Retrieval-related repository evidence detected', architectureEvidence['RAG / Retrieval'] || []);
  add('Agents', 'Agent/orchestration evidence detected', architectureEvidence['Agents / Orchestration'] || []);
  add('AI / LLM', 'LLM integration evidence detected', architectureEvidence['AI / LLM'] || []);
  return fingerprint;
}

export function buildHypothesis(architectureEvidence) {
  const map = [
    ['Frontend', 'Frontend layer'], ['Backend / API', 'API / backend layer'], ['Database', 'Persistence layer'],
    ['RAG / Retrieval', 'Retrieval layer'], ['AI / LLM', 'LLM layer'], ['Agents / Orchestration', 'Agent orchestration']
  ];
  return map.filter(([key]) => architectureEvidence[key]).map(([, label]) => label);
}
