import OpenAI from 'openai';

const AI_TIMEOUT_MS=45_000;

export function getBharatCodeClient(){
  const apiKey=process.env.BHARATCODE_API_KEY;
  if(!apiKey) return null;
  return new OpenAI({
    apiKey,
    baseURL:process.env.BHARATCODE_BASE_URL||'https://bharatcode.ai/api/model/v1'
  });
}

export async function askBharatCode(input){
  const client=getBharatCodeClient();
  if(!client) return {ok:false,error:'BHARATCODE_API_KEY is not configured'};
  try{
    const response=await client.responses.create({
      model:process.env.BHARATCODE_MODEL||'qwen-3.8-27b',
      input,
      store:false
    },{signal:AbortSignal.timeout(AI_TIMEOUT_MS)});
    return {ok:true,text:response.output_text};
  }catch(error){
    const timedOut=error?.name==='TimeoutError'||error?.name==='AbortError'||error?.code==='APITimeoutError';
    return {ok:false,error:timedOut?'The research model did not respond in time. Please try a shorter question.':'Model request failed'};
  }
}
