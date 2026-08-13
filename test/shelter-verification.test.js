import test from 'node:test'
import assert from 'node:assert/strict'
import { execute } from '../src/actions.js'

test('build_shelter verifies that at least one placed block remains in the world', async () => {
  const placed = new Map()
  const key = p => `${p.x},${p.y},${p.z}`
  const bot = {
    entity: { position: { floored: () => ({ x: 0, y: 64, z: 0 }) } },
    inventory: { items: () => [{ name: 'cobblestone', count: 20 }] },
    equip: async () => {},
    blockAt: p => p.y === 63 ? { name: 'stone', boundingBox: 'block', position: p } : { name: placed.get(key(p)) || 'air', boundingBox: 'empty', position: p },
    placeBlock: async (below, face) => { placed.set(key({ x: below.position?.x ?? 1, y: (below.position?.y ?? 63) + face.y, z: below.position?.z ?? 0 }), 'cobblestone') }
  }
  // The mock's blockAt/placement contract is enough to exercise the postcondition.
  const result = await execute(bot, { action: 'build_shelter', args: {} })
  assert.match(result, /riparo costruito/)
})
