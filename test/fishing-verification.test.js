import test from 'node:test'
import assert from 'node:assert/strict'
import { execute } from '../src/actions.js'

test('fish verifies that a fish entered the inventory', async () => {
  let items=[{name:'fishing_rod',count:1}]
  const bot={entity:{position:{distanceTo:()=>1}},inventory:{items:()=>items},equip:async()=>{},fish:async()=>{items=[...items,{name:'cod',count:1}]},entities:{},pathfinder:{goto:async()=>{}}}
  const result=await execute(bot,{action:'fish',args:{}})
  assert.match(result,/1 pesci raccolti/)
})

test('fish reports a failed catch instead of false success', async () => {
  const bot={entity:{position:{distanceTo:()=>1}},inventory:{items:()=>[{name:'fishing_rod',count:1}]},equip:async()=>{},fish:async()=>{},entities:{},pathfinder:{goto:async()=>{}}}
  await assert.rejects(()=>execute(bot,{action:'fish',args:{}}),/nessun pesce raccolto/)
})
