/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run "npm run dev" in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run "npm run deploy" to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */


export default {
  async fetch(request, env, ctx) {
    if(request.method==="GET"){
      return new Response(JSON.stringify({hoge:"huga"}),{headers:{"Content-Type":"application/json"}})
    }
    const data = await request.json(); 
    return new Response(JSON.stringify(data));
  },
};