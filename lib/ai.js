import OpenAI from 'openai';

const REQUEST_TIMEOUT_MS = 30_000;

export function getBharatCodeClient() {
  const apiKey = process.env.BHARATCODE_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({
    apiKey,
    baseURL: process.env.BHARATCODE_BASE_URL || 'https://bharatcode.ai/api/model/v1',
    timeout: REQUEST_TIMEOUT_MS,
    maxRetries: 1
  });
}

// Never throws: upstream failures become {ok:false,error} with a safe message.
export async function askBharatCode(input, instructions) {
  const client = getBharatCodeClient();
  if (!client) return { ok: false, error: 'The AI model is not configured on this deployment.' };
  try {
    const response = await client.responses.create({
      model: process.env.BHARATCODE_MODEL || 'qwen-3.8-27b',
      ...(instructions ? { instructions } : {}),
      input,
      store: false
    });
    const text = response.output_text;
    if (!text) return { ok: false, error: 'The AI model returned an empty answer.' };
    return { ok: true, text };
  } catch (error) {
    console.error('[ai] model request failed:', error?.status || error?.name || 'unknown');
    return { ok: false, error: 'The AI model is unavailable right now. Showing retrieved projects only.' };
  }
}
