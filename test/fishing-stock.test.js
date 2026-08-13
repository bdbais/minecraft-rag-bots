import test from 'node:test'
import assert from 'node:assert/strict'
import { autonomousProgressionDecision } from '../src/actions.js'

test('fisher replenishes a low food stock, not only an empty inventory', () => {
  const bot={inventory:{items:()=>[{name:'fishing_rod',count:1},{name:'bread',count:1},{name:'oak_log',count:8},{name:'crafting_table',count:1},{name:'wooden_pickaxe',count:1},{name:'wooden_axe',count:1},{name:'wooden_shovel',count:1},{name:'chest',count:1},{name:'furnace',count:1},{name:'torch',count:16}]},findBlock:()=>null,fish:async()=>{},registry:{blocksByName:{}}}
  const decision=autonomousProgressionDecision(bot,{profession:'fisher',health:20,food:20,nearbyEntities:[],nearbyBlocks:['water']},[])
  assert.equal(decision.action,'fish')
})

test('fishing shares the verified fishing spot', async()=>{
  const shared=[];let fishCount=0
  const bot={entity:{position:{x:4,y:64,z:-2}},inventory:{items:()=>[{name:'fishing_rod',count:1},{name:'cod',count:fishCount}]},equip:async()=>{},fish:async()=>{fishCount=1},entities:{}}
  await (await import('../src/actions.js')).execute(bot,{action:'fish',args:{}},{onShareCheckpoint:x=>shared.push(x)})
  assert.equal(shared[0].type,'resource')
})

