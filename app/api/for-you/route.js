import { getProjects, userOpportunity, buildUserProfile, STRONG_MATCH_SCORE, INTEREST_LABELS } from '@/lib/source';
import { createRateLimiter, getClientKey } from '@/lib/rate-limit';
import { readJsonCapped, rejectUnsuitableRequest, BodyTooLargeError, BodyTimeoutError, json } from '@/lib/http';
import { mapLimit } from '@/lib/github';

const MAX_BODY_BYTES = 8_192;
const MAX_PROFILES = 5;
const MAX_INTERESTS = 12;
const MAX_TEXT = 1_000;
const GITHUB_TIMEOUT_MS = 8_000;
const LOGIN_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;

const limiter = createRateLimiter({ windowMs: 60_000, max: 10 });
// Ceiling across all clients: each request fans out to up to ~10 GitHub calls.
const globalLimiter = createRateLimiter({ windowMs: 60_000, max: 120, maxKeys: 1 });

class UpstreamError extends Error {
  constructor(rateLimited) {
    super('upstream');
    this.rateLimited = rateLimited;
  }
}

function toLogin(value) {
  const match = value.match(/github\.com\/([^/?#]+)/i);
  const login = (match ? match[1] : value.replace(/^@/, '')).trim();
  return LOGIN_PATTERN.test(login) ? login : null;
}

async function githubJson(path, headers) {
  let res;
  try {
    res = await fetch('https://api.github.com' + path, { headers, signal: AbortSignal.timeout(GITHUB_TIMEOUT_MS), next: { revalidate: 900 } });
  } catch {
    throw new UpstreamError(false);
  }
  if (res.status === 404) return null;
  if (!res.ok) throw new UpstreamError(res.status === 429 || (res.status === 403 && res.headers.get('x-ratelimit-remaining') === '0'));
  return res.json();
}

async function loadProfile(login, headers) {
  const user = await githubJson('/users/' + encodeURIComponent(login), headers);
  if (!user) return null;
  const repos = (await githubJson('/users/' + encodeURIComponent(login) + '/repos?per_page=30&sort=updated', headers)) || [];
  return {
    user,
    repos: (Array.isArray(repos) ? repos : []).map((r) => ({ name: r.name, description: r.description, language: r.language, topics: r.topics || [] }))
  };
}

export async function POST(request) {
  const limit = limiter.check(getClientKey(request.headers));
  if (!limit.allowed || !globalLimiter.check('global').allowed) {
    return json({ error: 'Too many requests. Please try again shortly.' }, 429, { 'Retry-After': String(limit.retryAfter || 30) });
  }

  const rejected = rejectUnsuitableRequest(request);
  if (rejected) return rejected;

  let body;
  try {
    body = await readJsonCapped(request, MAX_BODY_BYTES);
  } catch (error) {
    if (error instanceof BodyTooLargeError) return json({ error: 'Request is too large.' }, 413);
    if (error instanceof BodyTimeoutError) return json({ error: 'Request body took too long to arrive.' }, 408);
    return json({ error: 'Request body must be valid JSON.' }, 400);
  }
  if (!body || typeof body !== 'object') return json({ error: 'Request body must be a JSON object.' }, 400);

  const asText = (value) => (typeof value === 'string' ? value.trim().slice(0, MAX_TEXT) : '');
  const building = asText(body.building);
  const interests = (Array.isArray(body.interests) ? body.interests : [])
    .filter((x) => typeof x === 'string').map((x) => x.trim().slice(0, 60)).filter(Boolean).slice(0, MAX_INTERESTS);
  const rawProfiles = [body.github, ...(Array.isArray(body.githubProfiles) ? body.githubProfiles : [])]
    .filter((x) => typeof x === 'string').map((x) => x.trim().slice(0, 200)).filter(Boolean);
  const logins = [...new Set(rawProfiles.map(toLogin).filter(Boolean))].slice(0, MAX_PROFILES);

  if (rawProfiles.length && !logins.length) return json({ error: 'That does not look like a GitHub username or profile URL.' }, 400);
  if (!logins.length && !building && !interests.length) return json({ error: 'Add a GitHub profile, a project idea, or at least one interest.' }, 400);

  try {
    let githubData = null;
    let notFound = [];
    if (logins.length) {
      const token = process.env.GITHUB_TOKEN;
      const headers = { accept: 'application/vnd.github+json', ...(token ? { authorization: 'Bearer ' + token } : {}) };
      const results = await mapLimit(logins, 3, (login) => loadProfile(login, headers));
      const loaded = results.filter(Boolean);
      notFound = logins.filter((_, i) => !results[i]);
      if (!loaded.length) return json({ error: 'No valid public GitHub profiles were found.' }, 404);
      githubData = {
        login: loaded[0].user.login, name: loaded[0].user.name, bio: loaded[0].user.bio,
        repos: loaded.flatMap((p) => p.repos), profiles: logins.filter((l) => !notFound.includes(l))
      };
    }

    const userProfile = buildUserProfile({ githubData, building, interests: interests.join(' ') });
    const projects = await getProjects();
    const recommendations = projects
      .map((project) => ({ project, ...userOpportunity(project, userProfile) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || b.project.community_score - a.project.community_score || a.project.rank - b.project.rank)
      .slice(0, 18);

    const active = Object.entries(userProfile.profile).filter(([, on]) => on).map(([key]) => INTEREST_LABELS[key] || key);
    return json({
      github: githubData && { login: githubData.login, name: githubData.name, bio: githubData.bio, profiles: githubData.profiles, repoCount: githubData.repos.length },
      profileSummary: active.length ? 'Atlas detected interest in ' + active.slice(0, 5).join(', ') + '.' : 'Atlas could not detect specific interests. Try selecting some below.',
      notFound,
      detected: userProfile.detected,
      recommendations,
      strongMatches: recommendations.filter((x) => x.score >= STRONG_MATCH_SCORE).slice(0, 6),
      worthExploring: recommendations.filter((x) => x.score < STRONG_MATCH_SCORE).slice(0, 8)
    });
  } catch (error) {
    if (error instanceof UpstreamError) {
      return json({ error: error.rateLimited
        ? 'GitHub is rate limiting Atlas right now. Try again later, or describe your interests instead of using a profile.'
        : 'GitHub could not be reached. Try again, or describe your interests instead.' }, 503);
    }
    return json({ error: 'Could not build your profile. Please try again.' }, 500);
  }
}
