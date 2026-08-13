import test from 'node:test'
import assert from 'node:assert/strict'
import { execute } from '../src/actions.js'

test('eat verifies that the hunger level increased when exposed by the client', async () => {
  const bot = {
    food: 5,
    inventory: { items: () => [{ name: 'bread', count: 1 }] },
    equip: async () => {},
    consume: async () => { bot.food = 12 }
  }
  const result = await execute(bot, { action: 'eat', args: {} })
  assert.equal(result, 'ate bread')
})
