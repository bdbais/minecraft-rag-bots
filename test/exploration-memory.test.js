import test from 'node:test'
import assert from 'node:assert/strict'
import { autonomousProgressionDecision } from '../src/actions.js'

test('planner avoids revisiting the same checkpoint in consecutive cycles', () => {
  const bot = {
    entity: { position: { x: 0, y: 64, z: 0 } },
    inventory: { items: () => [
      { name: 'oak_log', count: 8 }, { name: 'crafting_table', count: 1 },
      { name: 'stone_pickaxe', count: 1 }, { name: 'stone_axe', count: 1 },
      { name: 'chest', count: 1 }, { name: 'cobblestone', count: 16 }, { name: 'torch', count: 16 }
    ] },
    findBlock: () => null,
    registry: { blocksByName: {} },
    game: { dimension: 'overworld' }
  }
  const checkpoints = [{ type: 'poi', label: 'Vecchia miniera', x: 8, y: 64, z: 0, dimension: 'overworld' }]
  const decision = autonomousProgressionDecision(bot, { health: 20, food: 20, nearbyEntities: [], nearbyBlocks: [], recentActions: [{ action: 'move_to', goal: 'raggiungere Vecchia miniera', target: 'Vecchia miniera', success: true }] }, checkpoints)
  assert.notEqual(decision.action, 'move_to')
})
