# BharatCode Atlas

BharatCode Atlas is a JavaScript/JSX project-discovery and research workspace for the BharatCode Build League.

It is designed around one question:

> **What should I investigate next, and what can I learn from how other teams built it?**

## What Atlas does

- Loads the full BharatCode Build League corpus (294 projects at the last sync)
- Keeps BharatCode source facts separate from Atlas-derived analysis
- Search, filtering, categories, rankings, and hidden-gem discovery
- Universal **For You** recommendations using interests and optional public GitHub profiles
- Project detail pages with repository intelligence
- Architecture fingerprints backed by repository evidence
- Selective inspection of public repository manifests and deployment/CI configuration (secrets masked)
- Dependency-level technology evidence parsed from `package.json`, `requirements.txt`, `pyproject.toml`
- Compare **2–4 projects** side-by-side
- Compare source metrics, architecture layers, technologies, and evidence
- **Study this** workflow from any project
- Local Research Workspace with study status, notes, questions, ideas, and learning goals
- Saved repository evidence snapshots for research entries
- AI Researcher grounded in retrieved Atlas project records (keyword retrieval with stopword filtering and synonyms)
- JavaScript-only repository verification, dataset validation, and a `node:test` suite
- GitHub Actions CI: verification, tests, production build, and a separate dependency audit

## Research workflow

```text
Explore / For You
       ↓
    Project
       ↓
 ┌─────┴─────┐
 ↓           ↓
Study      Compare
 ↓         2–4 repos
 └─────┬─────┘
       ↓
Research Workspace
       ↓
To Study → Studying → Learned → Applied
```

## Repository intelligence

Atlas does not pretend that a keyword badge is a complete code audit.

The repository inspector uses:

- public GitHub repository metadata
- repository file paths
- README content (as the weakest evidence)
- dependency manifests, parsed for exact dependency names

It produces:

- technology signals
- architecture signals
- dependency evidence
- architecture hypotheses
- architecture fingerprints
- previews of manifests and deployment/CI configuration only

Evidence order of trust is dependency manifests, then file paths, then README terms. Matching is by exact dependency name or path segment, never raw substring.

Source inspection is intentionally bounded:

- Atlas never requests private repository access or passwords.
- Entry and API source files (for example `server.js`, `src/index.js`, `app/api/**`) are listed with their role but **their contents are never fetched or shown**.
- Files such as `.env*`, `*secret*`, `*token*`, `*.pem` and `*.key` are never requested.
- Previews are passed through a redactor that masks common token formats, `KEY=value` assignments, URL credentials and private-key blocks. Redaction is best effort, not a guarantee.
- Saved research snapshots keep only technology, architecture and fingerprint summaries, never file previews.

## Compare

Compare 2–4 projects from the project page or Compare route.

The comparison includes:

- BharatCode votes
- captured GitHub stars
- community score
- Atlas-derived relevance
- hidden-gem signal
- architecture layers
- technology signals
- evidence behind detected architecture
- architecture fingerprints

The goal is not simply to decide which project is “better”, but to understand **how their implementations differ**.

## Research Workspace

Research entries can contain:

- Why I saved it
- What I want to learn
- Architecture notes
- Useful technologies
- Ideas to adapt
- Questions
- Personal notes
- Collection
- Status:
  - To Study
  - Studying
  - Learned
  - Applied

Research is currently stored in browser localStorage. No Atlas account is required.

## Data integrity

BharatCode source facts are kept separate from Atlas-derived analysis.

Dataset notes:

- Descriptions are truncated at the source (about 190 characters), so description-based signals only see that text.
- Rows are flagged in `quality_flags` when several entries share one repository (`duplicate_repo`) or the description is too short to score (`minimal_description`). Hidden gems skips minimal rows and shows each shared repository once.
- Project ids are derived from the repository (`owner-repo`, with `-2`, `-3` for repeated repositories), not from leaderboard rank, so they survive re-syncs. Old `p001`-style links redirect to the new ids.

Atlas does not present:

- keyword detection
- relevance scores
- hidden-gem scores
- similarity
- repository heuristics

as official BharatCode classifications.

Repository intelligence is evidence-backed heuristic analysis, not a full manual code review.

## JavaScript-only stack

This project intentionally uses **JavaScript and JSX only**.

Core stack:

- Next.js 15
- React 19
- Node.js
- JavaScript
- JSX
- CSS
- GitHub REST API

There is no TypeScript source, `tsconfig.json`, or TypeScript Next.js configuration in the repository.

## Run locally

```bash
npm ci
npm run verify:js
npm run verify:data
npm test
npm run build
npm run dev
```

Then open the local Next.js development server.

### Environment variables

Copy `.env.example` to `.env.local` (git-ignored). All variables are optional:

| Variable | Purpose |
|---|---|
| `GITHUB_TOKEN` | Raises GitHub API limits for repository inspection, `/intelligence` and For You. Without it GitHub allows 60 requests per hour per IP and those features degrade to a clear "rate limit" message. |
| `BHARATCODE_API_KEY` | Enables AI Researcher answers. Without it the page shows retrieved projects only. |
| `BHARATCODE_BASE_URL` | Model API base URL (default `https://bharatcode.ai/api/model/v1`). |
| `BHARATCODE_MODEL` | Model name (default `qwen-3.8-27b`). |
| `TRUSTED_IP_HEADER` | Name of a request header that **your own proxy or CDN always sets** to the real client IP (for example `cf-connecting-ip`). Used to rate limit per client. |

### API limits and client identity

`/api/research` and `/api/for-you` accept only `application/json` bodies (415 otherwise), refuse browser-declared cross-site requests (403), cap the body at 8 KB, give up on a body that stalls for 5 seconds (408), and apply a per-client plus a global rate limit. `/api/research` also allows at most two model calls at once.

Rate limits are keyed by client IP. Because a header the platform does not overwrite can be forged, Atlas trusts: the header named by `TRUSTED_IP_HEADER` when set; on Vercel, `x-vercel-forwarded-for` or `x-real-ip`; otherwise only the **last** `x-forwarded-for` hop. A bare `x-real-ip` is not trusted off-platform. Counters live in memory per server instance, so on serverless platforms this is a best-effort guard, not a global quota. Put a platform-level limit in front of the app if you need a hard one.

### Tests

`npm test` runs `node:test` suites for scoring, retrieval, redaction, repository heuristics, the rate limiter, request-body caps, dataset integrity, browser storage, the GitHub inspector (with a mocked GitHub) and both API route handlers. No network or extra dependencies are needed.

## Data synchronization

The repository includes a source synchronization script:

```bash
npm run data:sync
```

It parses the BharatCode project page, decodes HTML entities, assigns stable repository-based ids, adds quality flags, validates the result (unique ids and ranks, numeric fields, GitHub repository URLs) and only then writes `data/projects.json`. It refuses to write an invalid dataset and reports when the project count changed. `npm run verify:data` runs the same validation on the committed file.

## GitHub intelligence

Optional `GITHUB_TOKEN` support can increase GitHub API limits.

The application can still inspect public repositories without a token subject to GitHub's unauthenticated API limits. All GitHub calls have an 8 second timeout, results are cached in memory, failures are cached for two minutes so a page cannot hammer GitHub while it is rate limiting, and `/intelligence` samples the 24 top-ranked repositories at request time with bounded concurrency (it is never rendered at build time).

## AI Researcher

The AI Researcher first retrieves matching Atlas project records using a stopword-filtered, word-boundary keyword retrieval (ranked by distinct term hits), and then uses the configured model provider when available. Requests are rate-limited, bounded in size, and the model call enforces a timeout.

Retrieval tokenizes the question, drops stopwords, keeps short technical terms such as `rag`, `llm` and `ocr`, expands a few synonyms, and ranks projects by weighted hits (name matches count more than description matches). Project text is passed to the model as fenced, untrusted data.

The interface exposes retrieved project evidence alongside the answer so users can inspect the underlying projects. If the model is not configured or unavailable, the retrieved projects are still shown with an explanatory message.

### API limits

| Route | Limits |
|---|---|
| `POST /api/research` | 5 requests per minute per client, 60 per minute overall, 2 concurrent model calls, 8 KB body, 600-character question |
| `POST /api/for-you` | 10 requests per minute per client, 8 KB body, up to 5 GitHub profiles |

Limits are held in memory per server instance, so on serverless platforms they are a best-effort guard, not a global quota. The client key comes from the platform-provided `x-vercel-forwarded-for` / `x-real-ip` header, or the last `x-forwarded-for` hop; the client-controlled first hop is ignored. Use a shared store (for example Redis or your platform's rate limiting) if you need strict quotas.

## Dependency security

Atlas pins its direct production dependency versions in `package.json` (Next.js 15.5.x, React 19.2.x, `openai` 6.49.0) and commits `package-lock.json`, so CI and deployments use reproducible `npm ci` installs. After changing a dependency, run `npm install` in a networked environment and commit the updated lockfile. Run `npm run audit:prod` (also run weekly in CI) and check the official Next.js advisories before deploying.

## CI

GitHub Actions runs, on Node 20 and 22:

```text
npm ci
    ↓
npm run verify:js        (JavaScript-only rule + dataset integrity at build time)
    ↓
npm test                 (node --test: retrieval, redaction, source scoring)
    ↓
npm run audit:prod
    ↓
npm run verify:data
    ↓
npm test
    ↓
npm run build
```

A separate workflow, `atlas-audit.yml`, runs `npm run audit:prod` weekly and on demand (Actions → Atlas dependency audit → Run workflow). It is kept apart from CI so a newly published advisory does not block unrelated pull requests, and it fails visibly when one is found. Workflows have read-only `contents` permission, and actions are pinned to full commit SHAs.

## Deployment

Atlas is a standard Next.js app: `npm ci && npm run build && npm start`. It needs no database. Set the optional environment variables above in your platform. There is no dedicated health-check route; probe `/`. Security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`) are set in `next.config.mjs`; add a `Content-Security-Policy` suited to your host if needed.

## Current limitations

Atlas is intentionally not yet a full source-code security auditor.

Current repository analysis is based on bounded public-repository evidence rather than exhaustive source ingestion.

Future work can include:

- persistent server-side research accounts
- PostgreSQL + pgvector
- embeddings and semantic similarity
- deeper source-level architecture analysis
- richer AI-generated repository explanations
- historical GitHub intelligence
- automated architecture diagrams
- repository-to-repository implementation diffing

## Repository

`aayush-as69/BharatCode-Atlas`
