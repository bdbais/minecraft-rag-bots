import test from 'node:test'
import assert from 'node:assert/strict'
import { execute } from '../src/actions.js'

test('escape_hazard rejects a movement that still leaves the bot in fluid', async () => {
  const bot = { entity: { position: { floored: () => ({ x: 0, y: 64, z: 0 }) } }, clearControlStates: () => {}, pathfinder: { setGoal: () => {}, setMovements: () => {}, goto: async () => {} }, registry: { blocksByName: {} }, blockAt: p => ({ name: p.y === 63 ? 'stone' : 'water', boundingBox: p.y === 63 ? 'block' : 'empty' }) }
  await assert.rejects(() => execute(bot, { action: 'escape_hazard', args: {} }), /ancora dentro acqua o lava/)
})
