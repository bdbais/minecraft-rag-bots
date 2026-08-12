import test from 'node:test'
import assert from 'node:assert/strict'
import { Vec3 } from 'vec3'
import { observe } from '../src/observe.js'

const makeBot = (x, item, count, withSlots = true) => {
  const position = new Vec3(x, 64, 0)
  const stack = { name: item, displayName: item, count }
  const slots = Array(46).fill(null)
  slots[36] = stack
  return {
    entity: { position }, health: 20, food: 20, oxygenLevel: 20,
    quickBarSlot: 0, heldItem: stack, game: { dimension: 'overworld' },
    time: { timeOfDay: 0 }, inventory: withSlots
      ? { items: () => [stack], slots, hotbarStart: 36 }
      : { items: () => [stack] },
    entities: {}, findBlocks: () => [], blockAt: () => null
  }
}

test('two bot observations keep inventories isolated and tolerate transient slots', () => {
  const first = observe(makeBot(0, 'oak_log', 12))
  const second = observe(makeBot(20, 'cobblestone', 8, false))
  assert.equal(first.inventory.oak_log, 12)
  assert.equal(first.hotbar[0].name, 'oak_log')
  assert.equal(second.inventory.cobblestone, 8)
  assert.equal(second.hotbar.every(slot => slot === null), true)
  assert.equal(second.heldItem.name, 'cobblestone')
})
