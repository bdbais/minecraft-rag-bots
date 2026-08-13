import test from 'node:test'
import assert from 'node:assert/strict'
import { execute } from '../src/actions.js'

test('give_item records social memory only after inventory decreases', async () => {
  let count = 2; let memory
  const bot = {
    username: 'Grifa',
    inventory: { items: () => [{ name: 'bread', type: 1, count }] },
    players: { Alex: { username: 'Alex', entity: { position: { x: 1, y: 64, z: 1 } } } },
    entity: { position: { distanceTo: () => 1 } },
    pathfinder: { goto: async () => {} },
    toss: async (_type, _metadata, amount) => { count -= amount }
  }
  const result = await execute(bot, { action: 'give_item', args: { username: 'Alex', name: 'bread', count: 1 } }, { onSocial: async (_name, value) => { memory = value } })
  assert.match(result, /gave 1 bread/)
  assert.match(memory.memory, /condiviso/)
})
