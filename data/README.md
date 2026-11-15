# BharatCode Atlas data

`projects.json` contains the projects published on the BharatCode Build League project page (294 at the last sync; the exact number is in the `count` field).

## Fields

| Field | Meaning |
|---|---|
| `id` | Stable id derived from the repository (`owner-repo`, `-2`, `-3` for repeated repositories). Not derived from rank. |
| `rank` | Leaderboard rank at capture time |
| `project_name`, `description` | Published text. Descriptions are truncated at the source. |
| `votes`, `github_stars`, `community_score` | Source metrics at capture time |
| `github_repo` | Public GitHub repository URL |
| `quality_flags` | Optional: `duplicate_repo` (several entries share a repository), `minimal_description` (too short to score) |

## Rebuild

```bash
npm run data:sync
npm run verify:data
```

The sync script downloads the public project page, decodes HTML entities, assigns ids and flags, validates the dataset and writes `data/projects.json`. It refuses to write an invalid dataset and prints the previous count if the number of projects changed.

The dataset is source data. Atlas classifications, relevance and hidden-gem scores are derived separately and must not be presented as official BharatCode classifications.

Source: https://bharatcode.ai/hackathon/projects
