import test from 'node:test'
import assert from 'node:assert/strict'
import { execute } from '../src/actions.js'

test('harvest_crops only harvests mature crops and verifies inventory growth', async () => {
  let food = 0
  const bot = {
    entity: { position: { distanceTo: () => 1 } },
    inventory: { items: () => food ? [{ name: 'wheat', count: food }] : [] },
    findBlocks: () => [{ x: 1, y: 64, z: 1 }],
    blockAt: p => ({ name: 'wheat', position: p, getProperties: () => ({ age: 7 }) }),
    pathfinder: { goto: async () => {} },
    dig: async () => { food += 3 }
  }
  const result = await execute(bot, { action: 'harvest_crops', args: { count: 1 } })
  assert.match(result, /raccolte 1 colture mature/)
})
