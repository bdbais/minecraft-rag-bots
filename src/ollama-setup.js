export function analyzeOllamaTags(payload = {}) {
  const names = new Set((payload.models || []).flatMap(x => [x.name, x.model]).filter(Boolean).map(x => String(x).replace(/:latest$/, '')))
  return { running:true, models:[...names].sort(), hasMinecraftAgent:names.has('minecraft-agent'), hasEmbeddingModel:names.has('nomic-embed-text'), ready:names.has('minecraft-agent') && names.has('nomic-embed-text') }
}

export async function queryOllama(baseUrl = 'http://localhost:11434', fetchImpl = fetch) {
  try { const response=await fetchImpl(`${String(baseUrl).replace(/\/$/,'')}/api/tags`,{signal:AbortSignal.timeout(3000)}); if(!response.ok) throw new Error(`HTTP ${response.status}`); return analyzeOllamaTags(await response.json()) }
  catch(error) { return {running:false,ready:false,hasMinecraftAgent:false,hasEmbeddingModel:false,models:[],error:error.message} }
}
