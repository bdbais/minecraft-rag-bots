import test from 'node:test'
import assert from 'node:assert/strict'
import { execute } from '../src/actions.js'

test('targeted exploration navigates to a visible redstone block', async () => {
  let destination
  const block = { name: 'redstone_ore', type: 7, position: { x: 4, y: 20, z: 2 } }
  const bot = {
    entity: { position: { x: 0, y: 20, z: 0 } },
    registry: { blocksByName: { redstone_ore: { id: 7 } } },
    entities: {},
    findBlock: ({ matching }) => matching(block) ? block : null,
    pathfinder: { goto: async goal => { destination = goal } }
  }
  const result = await execute(bot, { action: 'explore', args: { seek: 'redstone', radius: 16 } })
  assert.equal(destination.x, 4)
  assert.equal(destination.y, 20)
  assert.match(result, /target redstone/)
})
