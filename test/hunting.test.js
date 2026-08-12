import test from 'node:test'
import assert from 'node:assert/strict'
import { autonomousProgressionDecision } from '../src/actions.js'

test('hunts an edible animal only when hungry and no breeding pair is present', () => {
  const bot = { inventory: { items: () => [] }, game: { gameMode: 'survival' } }
  const decision = autonomousProgressionDecision(bot, { health: 20, food: 5, nearbyEntities: [{ type: 'mob', name: 'cow' }], nearbyBlocks: [] })
  assert.equal(decision.action, 'hunt_nearest')
  assert.equal(decision.args.target, 'cow')
})

test('does not hunt when two animals can be used for breeding', () => {
  const bot = { inventory: { items: () => [] }, game: { gameMode: 'survival' } }
  const decision = autonomousProgressionDecision(bot, { health: 20, food: 20, nearbyEntities: [{ type: 'mob', name: 'cow' }, { type: 'mob', name: 'cow' }], nearbyBlocks: [] })
  assert.notEqual(decision?.action, 'hunt_nearest')
})
