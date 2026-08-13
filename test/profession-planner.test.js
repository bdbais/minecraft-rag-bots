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

test('farmer profession harvests a mature field proactively', () => {
  const decision = autonomousProgressionDecision(bot([{ name: 'bread', count: 16 }]), { profession: 'farmer', health: 20, food: 20, nearbyEntities: [], nearbyBlocks: ['wheat'] }, [])
  assert.equal(decision.action, 'harvest_crops')
})

/* test('explorer profession chooses a visible discovery instead of random wandering', () => {
  const decision = autonomousProgressionDecision(bot([{ name: 'oak_log', count: 8 }, { name: 'crafting_table', count: 1 }, { name: 'wooden_pickaxe', count: 1 }, { name: 'wooden_axe', count: 1 }, { name: 'wooden_shovel', count: 1 }, { name: 'chest', count: 1 }, { name: 'furnace', count: 1 }, { name: 'torch', count: 16 }, { name: 'cobblestone', count: 16 }]), { profession: 'explorer', health: 20, food: 20, nearbyEntities: [], nearbyBlocks: [], visibleTargets: [{ name: 'village', x: 12, y: 64, z: -4, distance: 12 }] }, [])
  assert.equal(decision.action, 'move_to')
  assert.equal(decision.args.poi, 'village')
}) */
