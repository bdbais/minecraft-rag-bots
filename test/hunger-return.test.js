import test from 'node:test'
import assert from 'node:assert/strict'
import { autonomousProgressionDecision } from '../src/actions.js'

test('planner returns to the nearest base when critically hungry without food', () => {
  const bot = {
    entity: { position: { x: 20, y: 64, z: 0 } },
    inventory: { items: () => [{ name: 'stone_pickaxe', count: 1 }, { name: 'crafting_table', count: 1 }, { name: 'cobblestone', count: 16 }] },
    findBlock: () => null
  }
  const decision = autonomousProgressionDecision(bot, { health: 20, food: 5, nearbyEntities: [], nearbyBlocks: [], visibleTargets: [] }, [
    { type: 'base', label: 'Base lontana', x: 10, y: 64, z: 0 },
    { type: 'base', label: 'Base vicina', x: 18, y: 64, z: 0 }
  ])
  assert.equal(decision.action, 'move_to')
  assert.equal(decision.args.poi, 'Base vicina')
  assert.equal(decision.args.x, 18)
})
