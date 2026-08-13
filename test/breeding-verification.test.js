import test from 'node:test'
import assert from 'node:assert/strict'
import { execute } from '../src/actions.js'

test('breed action verifies that feeding changed the world', async () => {
  let wheat = 2
  const entities = {
    a: { type: 'mob', name: 'cow', position: { distanceTo: () => 1 } },
    b: { type: 'mob', name: 'cow', position: { distanceTo: () => 1 } }
  }
  const bot = {
    entity: { position: { distanceTo: () => 1 } },
    entities,
    inventory: { items: () => [{ name: 'wheat', count: wheat }] },
    equip: async () => {},
    pathfinder: { goto: async () => {} },
    activateEntity: async () => { wheat--; entities.baby = { type: 'mob', name: 'cow', position: { distanceTo: () => 1 } } }
  }
  const result = await execute(bot, { action: 'breed_animals', args: { species: 'cow' } })
  assert.match(result, /allevamento avviato/)
  assert.match(result, /nuova nascita/)
})
