# BharatCode Atlas

BharatCode Atlas is a project discovery and research workspace for the BharatCode Build League.

## MVP

- 294-project source integration
- Overview dashboard
- Project explorer
- Search and signal filters
- Project detail pages
- Transparent Atlas-derived research signals
- Hidden-gem heuristic
- Compare surface
- Grounded metadata research interface

## Data integrity

BharatCode source facts are kept separate from Atlas-derived analysis. Atlas does not present keyword detection, relevance, similarity or hidden-gem scores as official BharatCode classifications.

## Run

```bash
npm install
npm run dev
```

The app reads the Build League project page server-side and parses the published project cards, so the explorer does not depend on a hand-maintained list.

## Roadmap

PostgreSQL + pgvector, persistent research collections, BharatCode server-side inference, embeddings, GitHub repository analysis and evidence-backed architecture fingerprints.
