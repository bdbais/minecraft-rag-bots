import test from 'node:test'
import assert from 'node:assert/strict'
import { execute } from '../src/actions.js'

test('collect_drops verifies that the ground entity disappeared before success', async () => {
  const drop = { name: 'item', position: { x: 1, y: 64, z: 0, distanceTo: () => 1 } }
  const bot = {
    entity: { position: { distanceTo: () => 1 } },
    entities: { drop },
    inventory: { items: () => [] },
    pathfinder: { goto: async () => { delete bot.entities.drop } }
  }
  const result = await execute(bot, { action: 'collect_drops', args: { maxDistance: 8 } })
  assert.match(result, /raccolti 1/)
})

test('collect_drops reports failure when an item remains on the ground', async () => {
  const drop = { name: 'item', position: { x: 1, y: 64, z: 0, distanceTo: () => 1 } }
  const bot = {
    entity: { position: { distanceTo: () => 1 } },
    entities: { drop },
    inventory: { items: () => [] },
    pathfinder: { goto: async () => {} }
  }
  await assert.rejects(() => execute(bot, { action: 'collect_drops', args: { maxDistance: 8 } }), /ancora a terra/)
})
