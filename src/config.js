import 'dotenv/config'

function integer(name, fallback) {
  const value = Number.parseInt(process.env[name] ?? '', 10)
  return Number.isFinite(value) ? value : fallback
}

export const config = {
  mc: {
    host: process.env.MC_HOST || 'localhost',
    port: integer('MC_PORT', 25565),
    username: process.env.MC_USERNAME || 'OllamaBot',
    auth: process.env.MC_AUTH || 'offline',
    version: process.env.MC_VERSION || undefined
  },
  ollamaUrl: (process.env.OLLAMA_URL || 'http://localhost:11434').replace(/\/$/, ''),
  model: process.env.OLLAMA_MODEL || 'minecraft-agent',
  embedModel: process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text',
  intervalMs: integer('AGENT_INTERVAL_MS', 2500),
  maxSteps: integer('AGENT_MAX_STEPS', 0),
  topK: integer('MEMORY_TOP_K', 5),
  allowPvp: process.env.AGENT_ALLOW_PVP === 'true',
  autoStart: process.env.AGENT_AUTO_START !== 'false'
}
