import test from 'node:test'
import assert from 'node:assert/strict'
import { Biography } from '../src/biography.js'

test('biography renders a chronological markdown story', async () => {
  const bio = new Biography('unused', { name: 'Pippo', username: 'Pippo' },{weather:()=>({icon:'☂',label:'Pioggia',biome:'plains'})}); bio.save = async () => {}
  await bio.startSession('localhost:54321', 'explorer'); await bio.add('success', 'Prima impresa', 'Pippo ha raccolto la sua prima risorsa.')
  const markdown = bio.toMarkdown()
  assert.match(markdown, /Biografia di Pippo/); assert.match(markdown, /Prima impresa/);assert.match(markdown,/Meteo: ☂ Pioggia/); assert.equal(bio.events.length, 2)
})
