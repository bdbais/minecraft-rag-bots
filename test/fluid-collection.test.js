import test from 'node:test'
import assert from 'node:assert/strict'
import { execute } from '../src/actions.js'

test('collect_fluid verifies a water source became a water bucket', async () => {
  let empty = 1
  let filled = 0
  const bot = {
    entity: { position: { distanceTo: () => 1 } },
    inventory: { items: () => [{ name: empty ? 'bucket' : 'water_bucket', count: 1 }, ...(filled ? [{ name: 'water_bucket', count: filled }] : [])] },
    findBlock: () => ({ name: 'water', position: { x: 1, y: 64, z: 1 } }),
    pathfinder: { goto: async () => {} },
    equip: async () => {},
    activateBlock: async () => { empty = 0; filled = 1 }
  }
  const result = await execute(bot, { action: 'collect_fluid', args: { fluid: 'water' } })
  assert.match(result, /raccolta verificata/)
})
