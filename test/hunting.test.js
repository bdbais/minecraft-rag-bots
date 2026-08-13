import test from 'node:test'
import assert from 'node:assert/strict'
import { autonomousProgressionDecision, execute } from '../src/actions.js'

test('hunts an edible animal only when hungry and no breeding pair is present', () => {
  const bot = { inventory: { items: () => [] }, game: { gameMode: 'survival' } }
  const decision = autonomousProgressionDecision(bot, { health: 20, food: 5, nearbyEntities: [{ type: 'mob', name: 'cow' }], nearbyBlocks: [] })
  assert.equal(decision.action, 'hunt_nearest')
  assert.equal(decision.args.target, 'cow')
})

test('does not hunt when two animals can be used for breeding', () => {
  const bot = { inventory: { items: () => [] }, game: { gameMode: 'survival' } }
  const decision = autonomousProgressionDecision(bot, { health: 20, food: 20, nearbyEntities: [{ type: 'mob', name: 'cow' }, { type: 'mob', name: 'cow' }], nearbyBlocks: [] })
  assert.notEqual(decision?.action, 'hunt_nearest')
})

test('hunt action collects nearby drops after the attack', async () => {
  const calls = []
  const target = { type: 'mob', name: 'cow', position: { distanceTo: () => 2 } }
  const bot = { entity: { position: { distanceTo: () => 2 } }, inventory: { items: () => [{ name: 'stone_sword', count: 1 }] }, entities: { item: { name: 'item', position: { distanceTo: () => 1, x: 1, y: 64, z: 1 } } }, nearestEntity: () => target, pathfinder: { setMovements: () => {}, goto: async () => {} }, attack: () => calls.push('attack') }
  const { execute } = await import('../src/actions.js')
  await execute(bot, { action: 'hunt_nearest', args: {} })
  assert.deepEqual(calls, ['attack'])
})

test('hunt equips an available weapon before attacking', async()=>{const equipped=[];const target={type:'mob',name:'cow',position:{distanceTo:()=>2}};const bot={entity:{position:{distanceTo:()=>2}},inventory:{items:()=>[{name:'stone_sword',count:1}]},nearestEntity:()=>target,equip:async(i,s)=>equipped.push([i.name,s]),pathfinder:{setMovements:()=>{},goto:async()=>{}},attack:()=>{},entities:{}};await execute(bot,{action:'hunt_nearest',args:{}});assert.deepEqual(equipped,[['stone_sword','hand']])})

test('hunt accepts a visible edible target up to 32 blocks away', async()=>{
  const target={type:'mob',name:'cow',position:{x:24,y:64,z:0,distanceTo:()=>24}}
  const bot={entity:{position:{x:0,y:64,z:0,distanceTo:()=>24}},inventory:{items:()=>[]},nearestEntity:predicate=>predicate(target)?target:null,pathfinder:{setMovements:()=>{},goto:async()=>{}},attack:()=>{},entities:{}}
  await execute(bot,{action:'hunt_nearest',args:{}})
})

test('hunt shares the verified fauna location', async()=>{
  const shared=[];const target={type:'mob',name:'cow',position:{x:24,y:64,z:0,distanceTo:()=>2}}
  const bot={entity:{position:{x:0,y:64,z:0,distanceTo:()=>2}},inventory:{items:()=>[]},nearestEntity:()=>target,pathfinder:{setMovements:()=>{},goto:async()=>{}},attack:()=>{},entities:{}}
  await execute(bot,{action:'hunt_nearest',args:{}},{onShareCheckpoint:x=>shared.push(x)})
  assert.equal(shared[0].type,'resource')
})
