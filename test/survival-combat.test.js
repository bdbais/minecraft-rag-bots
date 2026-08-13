import test from 'node:test'
import assert from 'node:assert/strict'
import { autonomousProgressionDecision, execute } from '../src/actions.js'

test('autonomous planner protects low-health bot from hostile mobs', () => {
  const bot = { inventory: { items: () => [{ name: 'bread', count: 2 }] }, game: { gameMode: 'survival' } }
  const decision = autonomousProgressionDecision(bot, { health: 5, food: 20, nearbyEntities: [{ type: 'mob', name: 'zombie' }], nearbyBlocks: [] })
  assert.equal(decision.action, 'escape_hazard')
})

test('autonomous planner flees a close hostile mob when unarmed and without a table', () => {
  const bot = { inventory: { items: () => [] }, game: { gameMode: 'survival' } }
  const decision = autonomousProgressionDecision(bot, { health: 20, food: 20, nearbyEntities: [{ type: 'mob', name: 'zombie', distance: 3 }], nearbyBlocks: [] })
  assert.equal(decision.action, 'escape_hazard')
})

test('autonomous planner attacks hostile mobs only when armed', () => {
  const bot = { inventory: { items: () => [{ name: 'stone_sword', count: 1 }] }, game: { gameMode: 'survival' } }
  const decision = autonomousProgressionDecision(bot, { health: 20, food: 20, nearbyEntities: [{ type: 'mob', name: 'zombie' }], nearbyBlocks: [] })
  assert.equal(decision.action, 'attack_nearest')
  assert.equal(decision.args.target, 'zombie')
})

test('attack_nearest does not select passive animals by default', async () => {
  const bot = {
    entity: { position: { distanceTo: () => 2 } }, entities: {},
    nearestEntity: predicate => [{ type: 'mob', name: 'cow', position: { distanceTo: () => 2 } }].find(predicate)
  }
  await assert.rejects(() => execute(bot, { action: 'attack_nearest', args: {} }), /no allowed nearby target/)
})

test('attack_nearest equips a shield in the off hand when available', async () => {
  let destination = ''
  const target = { type: 'mob', name: 'zombie', position: { distanceTo: () => 2 } }
  const bot = { entity: { position: { distanceTo: () => 2 } }, inventory: { items: () => [{ name: 'shield', count: 1 }] }, nearestEntity: () => target, equip: async (_item, slot) => { destination = slot }, pathfinder: { setMovements: () => {}, goto: async () => {} }, attack: () => {} }
  await execute(bot, { action: 'attack_nearest', args: {} })
  assert.equal(destination, 'off-hand')
})

test('attack_nearest equips the best weapon before approaching target', async () => {
  const slots=[]; const target={type:'mob',name:'zombie',position:{distanceTo:()=>2}}
  const bot={entity:{position:{distanceTo:()=>2}},inventory:{items:()=>[{name:'stone_sword',count:1}]},nearestEntity:()=>target,equip:async(item,slot)=>slots.push([item.name,slot]),pathfinder:{setMovements:()=>{},goto:async()=>{}},attack:()=>{}}
  await execute(bot,{action:'attack_nearest',args:{}})
  assert.deepEqual(slots,[['stone_sword','hand']])
})
