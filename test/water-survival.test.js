import test from 'node:test'
import assert from 'node:assert/strict'
import { autonomousProgressionDecision } from '../src/actions.js'

const base = items => ({ inventory: { items: () => items }, game: { gameMode: 'survival' } })

test('autonomous planner prepares a fishing rod near water when food is missing', () => {
  const decision = autonomousProgressionDecision(base([{ name: 'oak_planks', count: 4 }, { name: 'string', count: 2 }, { name: 'stick', count: 3 }]), { health: 20, food: 20, nearbyEntities: [], nearbyBlocks: ['water'] })
  assert.equal(decision.action, 'craft')
  assert.equal(decision.args.name, 'fishing_rod')
})

test('autonomous planner chooses fishing near water once a rod is available', () => {
  const bot = { ...base([{ name: 'fishing_rod', count: 1 }]), fish: () => {} }
  const decision = autonomousProgressionDecision(bot, { health: 20, food: 20, nearbyEntities: [], nearbyBlocks: ['water'] })
  assert.equal(decision.action, 'fish')
})
