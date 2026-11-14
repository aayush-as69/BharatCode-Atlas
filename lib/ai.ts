import OpenAI from 'openai';

export function getBharatCodeClient(){
  const apiKey=process.env.BHARATCODE_API_KEY;
  if(!apiKey) return null;
  return new OpenAI({apiKey,baseURL:process.env.BHARATCODE_BASE_URL||'https://bharatcode.ai/api/model/v1'});
}
export async function askBharatCode(input:string){
  const client=getBharatCodeClient();
  if(!client) return {ok:false as const,error:'BHARATCODE_API_KEY is not configured'};
  const response=await client.responses.create({model:process.env.BHARATCODE_MODEL||'qwen-3.8-27b',input,store:false});
  return {ok:true as const,text:response.output_text};
}
