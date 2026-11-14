# BharatCode Atlas

BharatCode Atlas is a JavaScript/JSX project-discovery and research workspace for the BharatCode Build League.

It is designed around one question:

> **What should I investigate next, and what can I learn from how other teams built it?**

## What Atlas does

- Loads the full 294-project BharatCode Build League corpus
- Keeps BharatCode source facts separate from Atlas-derived analysis
- Search, filtering, categories, rankings, and hidden-gem discovery
- Universal **For You** recommendations using interests and optional public GitHub profiles
- Project detail pages with repository intelligence
- Architecture fingerprints backed by repository evidence
- Selective inspection of public repository files
- Dependency-level technology evidence
- Compare **2–4 projects** side-by-side
- Compare source metrics, architecture layers, technologies, and evidence
- **Study this** workflow from any project
- Local Research Workspace with study status, notes, questions, ideas, and learning goals
- Saved repository evidence snapshots for research entries
- AI Researcher grounded in retrieved Atlas project records
- JavaScript-only repository verification
- GitHub Actions CI for JavaScript verification and production builds

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

The repository inspector can use:

- public GitHub repository metadata
- repository file paths
- README content
- dependency manifests
- a small allowlist of high-value source/configuration files

It produces:

- technology signals
- architecture signals
- dependency evidence
- architecture hypotheses
- architecture fingerprints
- redacted manifest previews

Source inspection is intentionally bounded. File previews are limited to dependency manifests (such as `package.json`) and every preview is passed through a redaction pass that masks credential-shaped values (`KEY=value`, `"apiKey": "..."`). Environment files, credential-named paths, and arbitrary source files are never fetched or displayed, and no source-file content is persisted into the local Research Workspace snapshot. Atlas does not request private repository access, passwords, or arbitrary secret files.

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
npm install
npm run verify:js
npm test
npm run build
npm run dev
```

Then open the local Next.js development server.

## Data synchronization

The repository includes a source synchronization script:

```bash
npm run data:sync
```

It validates that the BharatCode source currently contains the expected 294 project cards before writing the extracted dataset, precomputes the Atlas signal classification for each row, and warns about junk rows or duplicate repository URLs so upstream data issues are visible.

## GitHub intelligence

Optional `GITHUB_TOKEN` support can increase GitHub API limits.

The application can still inspect public repositories without a token subject to GitHub's unauthenticated API limits.

## AI Researcher

The AI Researcher first retrieves matching Atlas project records using a stopword-filtered, word-boundary keyword retrieval (ranked by distinct term hits), and then uses the configured model provider when available. Requests are rate-limited, bounded in size, and the model call enforces a timeout.

The interface exposes retrieved project evidence alongside the answer so users can inspect the underlying projects.

## Dependency security

Atlas pins its direct production dependency versions in `package.json`. Next.js is kept on the patched 15.5.x maintenance line, and React is pinned to a patched 19.2.x release. The project uses npm; after dependency changes, generate and commit `package-lock.json` with `npm install` in a networked npm environment so CI can use reproducible installs.

## CI

GitHub Actions runs:

```text
npm ci
    ↓
npm run verify:js        (JavaScript-only rule + dataset integrity at build time)
    ↓
npm test                 (node --test: retrieval, redaction, source scoring)
    ↓
npm run audit:prod
    ↓
npm run build
```

This protects the JavaScript-only requirement, validates the dataset before building, and catches production-build regressions. The workflow declares `permissions: contents: read` and pins its actions to full commit SHAs.

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
