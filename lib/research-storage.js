// Browser-side storage for the research workspace. Every access is guarded:
// storage can be missing, blocked, corrupted, or full.

export const RESEARCH_KEY = 'bharatcode-atlas-research-v2';

export const EMPTY_NOTES = {
  status: 'To Study',
  collection: 'General',
  whySaved: '',
  learningGoal: '',
  architectureNotes: '',
  usefulTechnologies: '',
  ideasToAdapt: '',
  questions: '',
  personalNotes: ''
};

function getStorage(storage) {
  if (storage) return storage;
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

export function loadResearch(storage) {
  const store = getStorage(storage);
  if (!store) return [];
  try {
    const parsed = JSON.parse(store.getItem(RESEARCH_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((x) => x && typeof x === 'object') : [];
  } catch {
    return [];
  }
}

// Returns {ok:true} or {ok:false,error}. Never throws.
export function saveResearch(items, storage) {
  const store = getStorage(storage);
  if (!store) return { ok: false, error: 'Browser storage is unavailable, so research cannot be saved.' };
  try {
    store.setItem(RESEARCH_KEY, JSON.stringify(items));
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not save: browser storage is full or blocked. Delete old entries and try again.' };
  }
}

// Keep only what the workspace displays; never persist raw file previews.
export function compactIntelligence(repo) {
  if (!repo?.ok) return null;
  return {
    ok: true,
    repository: repo.repository ? { full_name: repo.repository.full_name, language: repo.repository.language } : undefined,
    technologies: (repo.technologies || []).slice(0, 30),
    architecture: (repo.architecture || []).slice(0, 30),
    evidence: {
      architecture_fingerprint: (repo.evidence?.architecture_fingerprint || []).slice(0, 12).map((x) => ({
        layer: x.layer,
        signal: x.signal,
        evidence: (x.evidence || []).slice(0, 4)
      }))
    },
    captured_at: new Date().toISOString()
  };
}

export function addResearchEntry(entry, storage) {
  const items = loadResearch(storage);
  const duplicate = items.find((x) =>
    entry.comparison
      ? x.comparison && [...x.comparison].sort().join(',') === [...entry.comparison].sort().join(',')
      : x.project?.id === entry.project?.id
  );
  if (duplicate) return { ok: true, existing: true };
  return saveResearch([entry, ...items], storage);
}

export function newEntryId() {
  try {
    return globalThis.crypto.randomUUID();
  } catch {
    return String(Date.now()) + '-' + Math.random().toString(36).slice(2, 8);
  }
}
