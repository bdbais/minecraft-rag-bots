export class OllamaClient {
  constructor(baseUrl, chatModel, embedModel, scheduler = null, options = {}) {
    this.baseUrl = baseUrl
    this.chatModel = chatModel
    this.embedModel = embedModel
    this.scheduler = scheduler
    this.retryDelayMs = 1500
    this.fallbackModel=options.fallbackModel||'';this.onFallback=options.onFallback;this.onUsage=options.onUsage;this.consecutiveDecisionFailures=0
  }

  async request(path, body, timeoutMs = 120000, externalSignal) {
    const run = async schedulerSignal => {
      const controller = new AbortController()
      const signals = [controller.signal, externalSignal, schedulerSignal].filter(Boolean)
      const signal = signals.length > 1 ? AbortSignal.any(signals) : signals[0]
      const timer = setTimeout(() => controller.abort(new Error(`Timeout Ollama dopo ${Math.round(timeoutMs / 1000)}s`)), timeoutMs)
      try {
        for(let attempt=0;attempt<7;attempt++){
          const response=await fetch(`${this.baseUrl}${path}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal})
          if(response.ok){const data=await response.json();this.onUsage?.({provider:'offline',model:body.model,usage:data});return data}
          const detail=await response.text(),transient=[429,500,502,503,504].includes(response.status)||/bootstrap|loading|not ready|runner/i.test(detail)
          if(!transient||attempt===6)throw new Error(`Ollama ${response.status}: ${detail}`)
          await new Promise((resolve,reject)=>{const timer=setTimeout(resolve,this.retryDelayMs*(attempt+1));signal?.addEventListener('abort',()=>{clearTimeout(timer);reject(signal.reason||new Error('Ollama interrotto'))},{once:true})})
        }
      } finally { clearTimeout(timer) }
    }
    return this.scheduler ? this.scheduler.schedule(run, { signal: externalSignal, priority: path === '/api/chat' ? 2 : 1 }) : run()
  }

  async embed(input) {
    const result = await this.request('/api/embed', { model: this.embedModel, input })
    return result.embeddings
  }

  async decide(system, prompt, schema, signal) {
    const body=()=>({model:this.chatModel,stream:false,think:false,keep_alive:'10m',format:schema,options:{temperature:0.2},messages:[{role:'system',content:system},{role:'user',content:prompt}]})
    try{const result=await this.request('/api/chat',body(),120000,signal);this.consecutiveDecisionFailures=0;return JSON.parse(result.message.content)}
    catch(error){if(/timeout|bootstrap|loading|not ready|503/i.test(error.message))this.consecutiveDecisionFailures++;else this.consecutiveDecisionFailures=0;if(this.fallbackModel&&this.chatModel!==this.fallbackModel&&this.consecutiveDecisionFailures>=2){const previous=this.chatModel;this.chatModel=this.fallbackModel;this.consecutiveDecisionFailures=0;this.onFallback?.({previous,current:this.chatModel,reason:error.message});const result=await this.request('/api/chat',body(),120000,signal);return JSON.parse(result.message.content)}throw error}
  }

  async write(system, prompt, timeoutMs = 240000) {
    const result = await this.request('/api/chat', { model: this.chatModel, stream: false, options: { temperature: 0.75, num_ctx: 16384 }, messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }] }, timeoutMs)
    return result.message.content
  }
}
