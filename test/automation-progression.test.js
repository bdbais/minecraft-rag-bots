import test from 'node:test'
import assert from 'node:assert/strict'
import { autonomousProgressionDecision } from '../src/actions.js'

const bot = items => ({ inventory: { items: () => items }, game: { gameMode: 'survival' }, findBlock: () => null, registry: { blocksByName: {} } })

test('autonomous planner crafts a furnace from gathered stone', () => {
  const decision = autonomousProgressionDecision(bot([{ name: 'crafting_table', count: 1 }, { name: 'cobblestone', count: 8 }]), { health: 20, food: 20, nearbyEntities: [], nearbyBlocks: [] })
  assert.equal(decision.action, 'craft')
  assert.equal(decision.args.name, 'furnace')
})

test('autonomous planner experiments with redstone after basic supplies exist', () => {
  const decision = autonomousProgressionDecision(bot([{ name: 'crafting_table', count: 1 }, { name: 'redstone', count: 2 }, { name: 'stick', count: 2 }]), { health: 20, food: 20, nearbyEntities: [], nearbyBlocks: [] })
  assert.equal(decision.action, 'craft')
  assert.equal(decision.args.name, 'redstone_torch')
})

test('autonomous planner extends a redstone experiment with a lever', () => {
  const decision = autonomousProgressionDecision(bot([{ name: 'crafting_table', count: 1 }, { name: 'redstone_torch', count: 1 }, { name: 'cobblestone', count: 1 }, { name: 'stick', count: 1 }]), { health: 20, food: 20, nearbyEntities: [], nearbyBlocks: [] })
  assert.equal(decision.action, 'craft')
  assert.equal(decision.args.name, 'lever')
})
