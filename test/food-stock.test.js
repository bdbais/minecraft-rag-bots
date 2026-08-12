import test from 'node:test'
import assert from 'node:assert/strict'
import { autonomousProgressionDecision } from '../src/actions.js'

test('planner builds a food reserve before a long expedition', () => {
  const bot = { inventory: { items: () => [{ name: 'bread', count: 2 }] }, game: { gameMode: 'survival' } }
  const decision = autonomousProgressionDecision(bot, { health: 20, food: 20, nearbyEntities: [{ type: 'mob', name: 'cow' }], nearbyBlocks: [] })
  assert.equal(decision.action, 'hunt_nearest')
  assert.equal(decision.args.target, 'cow')
})
