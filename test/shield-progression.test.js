import test from 'node:test'
import assert from 'node:assert/strict'
import { autonomousProgressionDecision } from '../src/actions.js'

test('autonomous planner crafts a shield before risky exploration', () => {
  const bot = { inventory: { items: () => [{ name: 'crafting_table', count: 1 }, { name: 'iron_ingot', count: 1 }, { name: 'oak_planks', count: 4 }] }, game: { gameMode: 'survival' }, findBlock: () => null, registry: { blocksByName: {} } }
  const decision = autonomousProgressionDecision(bot, { health: 20, food: 20, nearbyEntities: [], nearbyBlocks: [] })
  assert.equal(decision.action, 'craft')
  assert.equal(decision.args.name, 'shield')
})
