import fs from 'node:fs/promises'
import path from 'node:path'

export function cosine(a, b) {
  if (!a?.length || a.length !== b?.length) return -1
  let dot = 0, aa = 0, bb = 0
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; aa += a[i] ** 2; bb += b[i] ** 2 }
  return dot / (Math.sqrt(aa) * Math.sqrt(bb) || 1)
}

export class MemoryStore {
  constructor(file, ollama) { this.file = file; this.ollama = ollama; this.items = [] }
  async load() {
    try { this.items = JSON.parse(await fs.readFile(this.file, 'utf8')) } catch (e) { if (e.code !== 'ENOENT') throw e }
  }
  async save() { await fs.mkdir(path.dirname(this.file), { recursive: true }); await fs.writeFile(this.file, JSON.stringify(this.items, null, 2)) }
  async add(text, metadata = {}) {
    const [embedding] = await this.ollama.embed(text)
    this.items.push({ id: crypto.randomUUID(), text, metadata, embedding, createdAt: new Date().toISOString() })
    if (this.items.length > 5000) this.items.splice(0, this.items.length - 5000)
    await this.save()
  }
  async search(query, limit = 5) {
    if (!this.items.length) return []
    const [embedding] = await this.ollama.embed(query)
    return this.items.map(item => ({ ...item, score: cosine(embedding, item.embedding) }))
      .sort((a, b) => b.score - a.score).slice(0, limit)
  }
}
