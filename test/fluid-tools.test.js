import test from 'node:test'
import assert from 'node:assert/strict'
import { autonomousProgressionDecision } from '../src/actions.js'

const makeBot = items => ({ inventory: { items: () => items }, game: { gameMode: 'survival' }, findBlock: () => null, registry: { blocksByName: {} } })

test('prepares a bucket when iron is available', () => {
  const decision = autonomousProgressionDecision(makeBot([{ name: 'crafting_table', count: 1 }, { name: 'iron_ingot', count: 3 }]), { health: 20, food: 20, nearbyEntities: [], nearbyBlocks: ['water'] })
  assert.equal(decision.action, 'craft')
  assert.equal(decision.args.name, 'bucket')
})

test('prepares flint and steel for a planned Nether or defense task', () => {
  const decision = autonomousProgressionDecision(makeBot([{ name: 'crafting_table', count: 1 }, { name: 'iron_ingot', count: 1 }, { name: 'flint', count: 1 }]), { health: 20, food: 20, nearbyEntities: [], nearbyBlocks: ['lava'] })
  assert.equal(decision.action, 'craft')
  assert.equal(decision.args.name, 'flint_and_steel')
})
