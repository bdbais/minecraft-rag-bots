import test from 'node:test'
import assert from 'node:assert/strict'
import { EpicBookGenerator, prepareChronicle } from '../src/epic-book.js'

test('epic book combines heroes chronologically', async () => {
  const source = prepareChronicle({ name: 'Pippo' }, [{ identity: { name: 'Pippo' }, events: [{ at: '2026-01-02', title: 'Due' }, { at: '2026-01-01', title: 'Uno' }] }])
  assert.deepEqual(source.events.map(x => x.title), ['Uno','Due'])
  const fake = { write: async (_s, p) => p.includes('Crea in Markdown') ? '# La Saga\n\n## Prologo\nInizio\n\n## Epilogo\nFine' : '## Capitolo 1 — Alba\nUna grande impresa.' }
  const book = await new EpicBookGenerator(fake).generate(source)
  assert.match(book, /La Saga/); assert.match(book, /Capitolo 1/); assert.match(book, /Epilogo/)
})
