import test from 'node:test'
import assert from 'node:assert/strict'
import { autonomousProgressionDecision } from '../src/actions.js'

function bot(items) {
  return { inventory: { items: () => items }, registry: { blocksByName: {} }, game: { dimension: 'overworld' }, fish: async () => {} }
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
test('scientist profession installs a completed experiment at the base', () => {
  const decision = autonomousProgressionDecision(bot([{ name: 'crafting_table', count: 1 }, { name: 'redstone_torch', count: 1 }, { name: 'lever', count: 1 }]), { profession: 'scientist', health: 20, food: 20, nearbyEntities: [], nearbyBlocks: [] }, [{ type: 'base', label: 'Base laboratorio' }])
  assert.equal(decision.action, 'build_redstone_defense')
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
test('hunter profession searches for fauna when no prey is visible', () => {
  const decision = autonomousProgressionDecision(bot([]), { profession: 'hunter', health: 20, food: 20, nearbyEntities: [], nearbyBlocks: [] }, [])
  assert.equal(decision.action, 'explore')
  assert.equal(decision.args.seek, 'animals')
})

test('farmer profession harvests a mature field proactively', () => {
  const decision = autonomousProgressionDecision(bot([{ name: 'bread', count: 16 }]), { profession: 'farmer', health: 20, food: 20, nearbyEntities: [], nearbyBlocks: ['wheat'] }, [])
  assert.equal(decision.action, 'harvest_crops')
})
test('farmer profession prepares a composter at the base', () => {
  const decision = autonomousProgressionDecision(bot([{ name: 'oak_planks', count: 8 }, { name: 'crafting_table', count: 1 }]), { profession: 'farmer', health: 20, food: 20, nearbyEntities: [], nearbyBlocks: [] }, [{ type: 'base', label: 'Base agricola' }])
  assert.equal(decision.action, 'craft')
  assert.equal(decision.args.name, 'composter')
})
test('farmer does not recraft a composter recorded by the team', () => {
  const decision = autonomousProgressionDecision(bot([{ name: 'oak_planks', count: 8 }, { name: 'crafting_table', count: 1 }]), { profession: 'farmer', health: 20, food: 20, nearbyEntities: [], nearbyBlocks: [] }, [{ type: 'base', label: 'Base agricola' }, { type: 'workstation', label: 'Composter agricolo' }])
  assert.notEqual(decision.args?.name, 'composter')
})
test('breeder profession searches for animals before building a pen', () => {
  const decision = autonomousProgressionDecision(bot([{ name: 'wheat', count: 8 }]), { profession: 'breeder', health: 20, food: 20, nearbyEntities: [], nearbyBlocks: [] }, [])
  assert.equal(decision.action, 'explore')
  assert.match(decision.goal, /animali/i)
})
test('breeder profession crafts fence materials before building a pen', () => {
  const decision = autonomousProgressionDecision(bot([{ name: 'oak_planks', count: 8 }, { name: 'stick', count: 4 }, { name: 'crafting_table', count: 1 }]), { profession: 'breeder', health: 20, food: 20, nearbyEntities: [{ type: 'mob', name: 'cow' }, { type: 'mob', name: 'cow' }], nearbyBlocks: [] }, [])
  assert.equal(decision.action, 'craft')
  assert.equal(decision.args.name, 'fence')
})
test('warrior profession crafts a weapon before patrol', () => {
  const decision = autonomousProgressionDecision(bot([{ name: 'cobblestone', count: 3 }, { name: 'stick', count: 2 }, { name: 'crafting_table', count: 1 }]), { profession: 'warrior', health: 20, food: 20, nearbyEntities: [], nearbyBlocks: [] }, [])
  assert.equal(decision.action, 'craft')
  assert.equal(decision.args.name, 'sword')
})
test('armed warrior patrols a sheltered base perimeter', () => {
  const decision = autonomousProgressionDecision(bot([{ name: 'iron_sword', count: 1 }]), { profession: 'warrior', health: 20, food: 20, nearbyEntities: [], nearbyBlocks: [] }, [{ type: 'base', label: 'Base protetta' }])
  assert.equal(decision.action, 'explore')
  assert.equal(decision.args.patrol, true)
})
test('warrior patrol advances to the next recorded sector', () => {
  const checkpoints = Array.from({ length: 3 }, (_, i) => ({ type: 'patrol', label: `Settore ${i}` }))
  const decision = autonomousProgressionDecision(bot([{ name: 'iron_sword', count: 1 }, { name: 'shield', count: 1 }]), { profession: 'warrior', health: 20, food: 20, nearbyEntities: [], nearbyBlocks: [] }, [{ type: 'base', label: 'Base protetta' }, ...checkpoints])
  assert.equal(decision.args.sector, 3)
})
test('warrior profession crafts a shield before patrol', () => {
  const decision = autonomousProgressionDecision(bot([{ name: 'iron_sword', count: 1 }, { name: 'iron_ingot', count: 1 }, { name: 'oak_planks', count: 1 }, { name: 'crafting_table', count: 1 }]), { profession: 'warrior', health: 20, food: 20, nearbyEntities: [], nearbyBlocks: [] }, [{ type: 'base', label: 'Base protetta' }])
  assert.equal(decision.action, 'craft')
  assert.equal(decision.args.name, 'shield')
})

/* test('explorer profession chooses a visible discovery instead of random wandering', () => {
  const decision = autonomousProgressionDecision(bot([{ name: 'oak_log', count: 8 }, { name: 'crafting_table', count: 1 }, { name: 'wooden_pickaxe', count: 1 }, { name: 'wooden_axe', count: 1 }, { name: 'wooden_shovel', count: 1 }, { name: 'chest', count: 1 }, { name: 'furnace', count: 1 }, { name: 'torch', count: 16 }, { name: 'cobblestone', count: 16 }]), { profession: 'explorer', health: 20, food: 20, nearbyEntities: [], nearbyBlocks: [], visibleTargets: [{ name: 'village', x: 12, y: 64, z: -4, distance: 12 }] }, [])
  assert.equal(decision.action, 'move_to')
  assert.equal(decision.args.poi, 'village')
}) */

test('builder profession establishes a shelter before exploration', () => {
  const decision = autonomousProgressionDecision(bot([{ name: 'oak_planks', count: 16 }]), { profession: 'builder', health: 20, food: 20, nearbyEntities: [], nearbyBlocks: [] }, [])
  assert.equal(decision.action, 'build_shelter')
})
test('builder profession prepares storage after shelter', () => {
  const decision = autonomousProgressionDecision(bot([{ name: 'oak_planks', count: 8 }, { name: 'crafting_table', count: 1 }]), { profession: 'builder', health: 20, food: 20, nearbyEntities: [], nearbyBlocks: [] }, [{ type: 'base', label: 'Riparo costruito' }])
  assert.equal(decision.action, 'craft')
  assert.equal(decision.args.name, 'chest')
})
test('builder does not recraft storage already recorded by the team', () => {
  const decision = autonomousProgressionDecision(bot([{ name: 'oak_planks', count: 8 }, { name: 'crafting_table', count: 1 }]), { profession: 'builder', health: 20, food: 20, nearbyEntities: [], nearbyBlocks: [] }, [{ type: 'base', label: 'Riparo costruito' }, { type: 'chest', label: 'Deposito materiali' }])
  assert.notEqual(decision.args?.name, 'chest')
})

test('fisher profession fishes near water when a rod is available', () => {
  const decision = autonomousProgressionDecision(bot([{ name: 'fishing_rod', count: 1 }, { name: 'oak_log', count: 8 }, { name: 'crafting_table', count: 1 }, { name: 'wooden_pickaxe', count: 1 }, { name: 'wooden_axe', count: 1 }, { name: 'wooden_shovel', count: 1 }, { name: 'chest', count: 1 }, { name: 'torch', count: 16 }, { name: 'cobblestone', count: 16 }]), { profession: 'fisher', health: 20, food: 20, nearbyEntities: [], nearbyBlocks: ['water'] }, [])
  assert.equal(decision.action, 'fish')
})
test('fisher profession searches for water when none is visible', () => {
  const decision = autonomousProgressionDecision(bot([]), { profession: 'fisher', health: 20, food: 20, nearbyEntities: [], nearbyBlocks: [] }, [])
  assert.equal(decision.action, 'explore')
  assert.equal(decision.args.seek, 'water')
})

test('trader profession proposes an exchange to a nearby teammate', () => {
  const decision = autonomousProgressionDecision(bot([{ name: 'iron_ingot', count: 8 }]), { profession: 'trader', health: 20, food: 20, nearbyEntities: [{ type: 'player', username: 'Alex', distance: 3 }], nearbyBlocks: [] }, [])
  assert.equal(decision.action, 'chat')
  assert.match(decision.args.message, /Alex/)
})
test('trader profession travels to a known market when alone', () => {
  const decision = autonomousProgressionDecision(bot([{ name: 'iron_ingot', count: 8 }]), { profession: 'trader', health: 20, food: 20, nearbyEntities: [], nearbyBlocks: [] }, [{ type: 'village', label: 'Villaggio mercantile', x: 12, y: 64, z: -4 }])
  assert.equal(decision.action, 'move_to')
  assert.equal(decision.args.x, 12)
})

test('priest profession offers social support to a nearby teammate', () => {
  const decision = autonomousProgressionDecision(bot([]), { profession: 'priest', health: 20, food: 20, nearbyEntities: [{ type: 'player', username: 'Marta', distance: 3 }], nearbyBlocks: [] }, [{ type: 'memorial', label: 'memoriale', x: 0, y: 64, z: 0 }])
  assert.equal(decision.action, 'chat')
  assert.match(decision.args.message, /Marta/)
})
