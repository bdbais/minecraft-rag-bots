import test from 'node:test'
import assert from 'node:assert/strict'
import { autonomousProgressionDecision, execute } from '../src/actions.js'

test('autonomous planner navigates when a boat and water are available', () => {
  const bot = { inventory: { items: () => [{ name: 'oak_boat', count: 1 }] }, game: { gameMode: 'survival' }, placeEntity() {}, mount() {} }
  const decision = autonomousProgressionDecision(bot, { health: 20, food: 20, nearbyEntities: [], nearbyBlocks: ['water'] })
  assert.equal(decision.action, 'navigate_boat')
})

test('navigate_boat equips, places, mounts and moves forward', async () => {
  const controls = []
  const bot = { inventory: { items: () => [{ name: 'oak_boat', count: 1 }] }, entity: { position: {} }, findBlock: () => ({ name: 'water' }), equip: async () => {}, placeEntity: async () => ({ id: 1 }), mount: async () => {}, setControlState: (key, value) => controls.push([key, value]) }
  const result = await execute(bot, { action: 'navigate_boat', args: { durationMs: 1000 } })
  assert.match(result, /navigazione completata/)
  assert.deepEqual(controls, [['forward', true], ['forward', false]])
})
