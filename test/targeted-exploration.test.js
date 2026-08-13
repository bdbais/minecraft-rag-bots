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

test('targeted seed exploration collects visible grass once reached', async () => {
  let destination, collected = false
  const grass = { name: 'grass', type: 8, position: { x: 3, y: 20, z: 1 } }
  const items = []
  const bot = {
    entity: { position: { x: 0, y: 20, z: 0 } },
    registry: { blocksByName: { grass: { id: 8 } } },
    entities: {},
    inventory: { items: () => items },
    findBlock: ({ matching }) => collected ? null : (matching(grass) ? grass : null),
    collectBlock: { collect: async () => { collected = true; items.push({ name: 'wheat_seeds', count: 1 }) } },
    pathfinder: { goto: async goal => { destination = goal } }
  }
  const result = await execute(bot, { action: 'explore', args: { seek: 'seeds', radius: 16 } })
  assert.equal(destination.x, 3)
  assert.equal(collected, true)
  assert.equal(items[0].name, 'wheat_seeds')
  assert.match(result, /raccolti|grass/i)
})

test('targeted water exploration reaches a visible source', async () => {
  let destination
  const water = { name: 'water', type: 9, position: { x: -5, y: 63, z: 4 } }
  const bot = {
    entity: { position: { x: 0, y: 64, z: 0 } },
    registry: { blocksByName: { water: { id: 9 } } },
    entities: {},
    findBlock: ({ matching }) => matching(water) ? water : null,
    pathfinder: { goto: async goal => { destination = goal } }
  }
  const result = await execute(bot, { action: 'explore', args: { seek: 'water', radius: 16 } })
  assert.equal(destination.x, -5)
  assert.equal(destination.z, 4)
  assert.match(result, /target water/)
})
