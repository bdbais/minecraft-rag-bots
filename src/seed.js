import path from 'node:path'
import { config } from './config.js'
import { OllamaClient } from './ollama.js'
import { MemoryStore } from './memory.js'
import { knowledge } from './knowledge.js'

const ollama = new OllamaClient(config.ollamaUrl, config.model, config.embedModel)
const store = new MemoryStore(path.resolve('data/memory.json'), ollama)
await store.load()
for (const text of knowledge) {
  if (!store.items.some(item => item.text === text)) await store.add(text, { type: 'knowledge' })
}
console.log(`Knowledge ready: ${store.items.length} memories.`)
