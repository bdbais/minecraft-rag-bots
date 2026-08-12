import test from 'node:test'
import assert from 'node:assert/strict'
import { autonomousProgressionDecision, execute } from '../src/actions.js'

test('autonomous planner protects low-health bot from hostile mobs', () => {
  const bot = { inventory: { items: () => [{ name: 'bread', count: 2 }] }, game: { gameMode: 'survival' } }
  const decision = autonomousProgressionDecision(bot, { health: 5, food: 20, nearbyEntities: [{ type: 'mob', name: 'zombie' }], nearbyBlocks: [] })
  assert.equal(decision.action, 'escape_hazard')
})

test('autonomous planner attacks hostile mobs only when armed', () => {
  const bot = { inventory: { items: () => [{ name: 'stone_sword', count: 1 }] }, game: { gameMode: 'survival' } }
  const decision = autonomousProgressionDecision(bot, { health: 20, food: 20, nearbyEntities: [{ type: 'mob', name: 'zombie' }], nearbyBlocks: [] })
  assert.equal(decision.action, 'attack_nearest')
  assert.equal(decision.args.target, 'zombie')
})

test('attack_nearest does not select passive animals by default', async () => {
  const bot = {
    entity: { position: { distanceTo: () => 2 } }, entities: {},
    nearestEntity: predicate => [{ type: 'mob', name: 'cow', position: { distanceTo: () => 2 } }].find(predicate)
  }
  await assert.rejects(() => execute(bot, { action: 'attack_nearest', args: {} }), /no allowed nearby target/)
})
