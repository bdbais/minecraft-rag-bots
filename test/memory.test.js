import test from 'node:test'
import assert from 'node:assert/strict'
import { cosine, MemoryStore } from '../src/memory.js'

test('cosine ranks identical vectors highest', () => {
  assert.equal(cosine([1, 0], [1, 0]), 1)
  assert.equal(cosine([1, 0], [0, 1]), 0)
})

test('memory returns semantically closest item', async () => {
  const ollama = { embed: async input => [String(input).includes('iron') ? [1, 0] : [0, 1]] }
  const store = new MemoryStore('unused', ollama)
  store.items = [{ text: 'iron tool', embedding: [1, 0] }, { text: 'wood tool', embedding: [0, 1] }]
  assert.equal((await store.search('iron', 1))[0].text, 'iron tool')
})
