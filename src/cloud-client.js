export class CloudAIClient {
  constructor(baseUrl, chatModel, embedModel, apiKey, scheduler = null) {
    this.baseUrl = (baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '')
    this.chatModel = chatModel
    this.embedModel = embedModel
    this.apiKey = apiKey
    this.scheduler = scheduler
  }
  async request(path, body, timeoutMs = 120000, externalSignal) {
    if (!this.apiKey) throw new Error('API key cloud mancante')
    const run = async schedulerSignal => {
      const controller = new AbortController(), signals = [controller.signal, externalSignal, schedulerSignal].filter(Boolean)
      const signal = signals.length > 1 ? AbortSignal.any(signals) : signals[0]
      const timer = setTimeout(() => controller.abort(new Error(`Timeout cloud dopo ${Math.round(timeoutMs/1000)}s`)), timeoutMs)
      try {
        const response = await fetch(`${this.baseUrl}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${this.apiKey}` }, body: JSON.stringify(body), signal })
        if (!response.ok) throw new Error(`Cloud AI ${response.status}: ${await response.text()}`)
        return response.json()
      } finally { clearTimeout(timer) }
    }
    return this.scheduler ? this.scheduler.schedule(run, { signal: externalSignal, priority: path.includes('chat') ? 2 : 1 }) : run()
  }
  async embed(input) { const result = await this.request('/embeddings', { model: this.embedModel, input }); return result.data.sort((a,b)=>a.index-b.index).map(x=>x.embedding) }
  async decide(system, prompt, schema, signal) {
    const messages = [{ role:'system', content:system }, { role:'user', content:`${prompt}\n\nReturn only JSON matching this schema: ${JSON.stringify(schema)}` }]
    let result
    try { result = await this.request('/chat/completions', { model:this.chatModel, messages, response_format:{ type:'json_schema', json_schema:{ name:'minecraft_agent_response', strict:true, schema } } }, 120000, signal) }
    catch (error) {
      if (!/400|response_format|json_schema/i.test(error.message)) throw error
      result = await this.request('/chat/completions', { model:this.chatModel, messages, response_format:{ type:'json_object' } }, 120000, signal)
    }
    return JSON.parse(result.choices[0].message.content)
  }
  async write(system, prompt, timeoutMs = 240000) { const result = await this.request('/chat/completions', { model:this.chatModel, messages:[{role:'system',content:system},{role:'user',content:prompt}] }, timeoutMs); return result.choices[0].message.content }
}
