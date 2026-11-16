import { getProjects } from '@/lib/source';
import { askBharatCode } from '@/lib/ai';
import { searchProjects } from '@/lib/search';
import { createRateLimiter, createGate, getClientKey } from '@/lib/rate-limit';
import { readJsonCapped, rejectUnsuitableRequest, BodyTooLargeError, BodyTimeoutError, json } from '@/lib/http';
import { INSTRUCTIONS, buildResearchInput } from '@/lib/research-prompt';

const MAX_BODY_BYTES = 8_192;
const MAX_QUESTION_CHARS = 600;
const MAX_RESULTS = 12;
const MAX_CONCURRENT_AI_REQUESTS = 2;

// Per client, plus a global ceiling so spoofed or shared client keys cannot
// drain the model quota. Counters are per server instance.
const clientLimiter = createRateLimiter({ windowMs: 60_000, max: 5 });
const globalLimiter = createRateLimiter({ windowMs: 60_000, max: 60, maxKeys: 1 });
const gate = createGate(MAX_CONCURRENT_AI_REQUESTS);

export async function POST(req) {
  const client = clientLimiter.check(getClientKey(req.headers));
  if (!client.allowed || !globalLimiter.check('global').allowed) {
    return json({ error: 'Too many research requests. Please try again shortly.' }, 429, { 'Retry-After': String(client.retryAfter || 30) });
  }

  const rejected = rejectUnsuitableRequest(req);
  if (rejected) return rejected;

  // Read and validate the body BEFORE claiming a model slot, so a slow or
  // malformed client cannot occupy capacity meant for real requests.
  let body;
  try {
    body = await readJsonCapped(req, MAX_BODY_BYTES);
  } catch (error) {
    if (error instanceof BodyTooLargeError) return json({ error: 'Research request is too large.' }, 413);
    if (error instanceof BodyTimeoutError) return json({ error: 'Request body took too long to arrive.' }, 408);
    return json({ error: 'Request body must be valid JSON.' }, 400);
  }

  const question = typeof body?.question === 'string' ? body.question.trim() : '';
  if (!question) return json({ error: 'Question is required.' }, 400);
  if (question.length > MAX_QUESTION_CHARS) {
    return json({ error: `Question must be ${MAX_QUESTION_CHARS} characters or fewer.` }, 413);
  }

  const release = gate.acquire();
  if (!release) {
    return json({ error: 'Research capacity is temporarily busy. Please try again shortly.' }, 429, { 'Retry-After': '15' });
  }

  try {
    const projects = searchProjects(await getProjects(), question, { limit: MAX_RESULTS });
    if (!projects.length) {
      return json({ question, projects: [], answer: null, error: 'No matching projects were found. Try different keywords, such as "voice", "RAG" or "security".' });
    }

    const input = buildResearchInput(question, projects);

    const result = await askBharatCode(input, INSTRUCTIONS);
    return json({
      question,
      projects,
      answer: result.ok ? result.text : null,
      error: result.ok ? null : result.error
    });
  } catch {
    return json({ error: 'Research is unavailable right now. Please try again.' }, 500);
  } finally {
    release();
  }
}
