# BharatCode Atlas data

The Atlas dataset contains the 294 projects published on the BharatCode Build League project page.

## Rebuild

Run:

```bash
npm run data:sync
```

This downloads the public project page, validates that exactly 294 project cards are present, and writes `data/projects.json`.

The dataset is source data. Atlas classifications, relevance and hidden-gem scores are derived separately and must not be presented as official BharatCode classifications.

Source: https://bharatcode.ai/hackathon/projects
