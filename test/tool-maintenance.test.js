import test from 'node:test'
import assert from 'node:assert/strict'
import { autonomousProgressionDecision } from '../src/actions.js'

test('autonomous planner replaces a nearly broken tool before exploration', () => {
  const bot = {
    inventory: { items: () => [{ name: 'crafting_table', count: 1 }, { name: 'iron_pickaxe', count: 1, durabilityUsed: 210, maxDurability: 250 }] },
    game: { gameMode: 'survival' },
    findBlock: () => null,
    registry: { blocksByName: { crafting_table: { id: 1 } } }
  }
  const decision = autonomousProgressionDecision(bot, { health: 20, food: 20, nearbyEntities: [], nearbyBlocks: [] })
  assert.equal(decision.action, 'craft')
  assert.equal(decision.args.name, 'iron_pickaxe')
})
