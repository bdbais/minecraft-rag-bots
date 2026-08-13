import test from 'node:test'
import assert from 'node:assert/strict'
import { autonomousProgressionDecision } from '../src/actions.js'

function bot(items) {
  return { inventory: { items: () => items }, registry: { blocksByName: {} }, game: { dimension: 'overworld' } }
}

test('scientist profession starts a reproducible redstone experiment', () => {
  const decision = autonomousProgressionDecision(bot([
    { name: 'crafting_table', count: 1 },
    { name: 'redstone', count: 2 },
    { name: 'stick', count: 2 }
  ]), { profession: 'scientist', health: 20, food: 20, nearbyEntities: [], nearbyBlocks: [] }, [])
  assert.equal(decision.action, 'craft')
  assert.equal(decision.args.name, 'redstone_torch')
})

test('priest profession records a memorial when a safe building block is available', () => {
  const decision = autonomousProgressionDecision(bot([{ name: 'stone', count: 8 }]), { profession: 'priest', health: 20, food: 20, nearbyEntities: [], nearbyBlocks: [] }, [])
  assert.equal(decision.action, 'build_memorial')
})

test('hunter profession maintains a food reserve before starvation', () => {
  const decision = autonomousProgressionDecision(bot([{ name: 'bread', count: 4 }]), { profession: 'hunter', health: 20, food: 18, nearbyEntities: [{ type: 'mob', name: 'cow', distance: 6 }], nearbyBlocks: [] }, [])
  assert.equal(decision.action, 'hunt_nearest')
  assert.equal(decision.args.target, 'cow')
})
