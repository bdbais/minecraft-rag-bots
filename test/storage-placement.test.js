import test from 'node:test'
import assert from 'node:assert/strict'
import { execute } from '../src/actions.js'
import { autonomousProgressionDecision } from '../src/actions.js'

test('store_items places an available chest when no container is nearby', async () => {
  let placed=false, deposited=0
  const bot={entity:{position:{floored:()=>({x:0,y:64,z:0}),distanceTo:()=>1}},inventory:{items:()=>[{name:'chest',type:1,count:1},{name:'cobblestone',type:2,count:3}]},findBlock:()=>placed?{name:'chest',position:{x:1,y:64,z:0}}:null,equip:async()=>{},blockAt:p=>p.y===63?{name:'stone',boundingBox:'block',position:p}:{name:placed?'chest':'air',boundingBox:placed?'block':'empty',position:p},placeBlock:async()=>{placed=true},pathfinder:{goto:async()=>{}},openContainer:async()=>({deposit:async()=>{deposited++},containerItems:()=>[],close:()=>{}})}
  const result=await execute(bot,{action:'store_items',args:{maxDistance:8}},{onStorageSeen:async()=>{},onShareCheckpoint:async()=>{}})
  assert.match(result,/depositati/);assert.equal(placed,true);assert.equal(deposited,1)
})

test('planner deposits when inventory slots are full even with many small stacks',()=>{
  const slots=Array.from({length:30},(_,i)=>({name:i===0?'stone_pickaxe':`material_${i}`,count:1}))
  const bot={inventory:{slots,items:()=>slots},game:{gameMode:'survival'}}
  const decision=autonomousProgressionDecision(bot,{health:20,food:20,nearbyEntities:[],nearbyBlocks:['chest']})
  assert.equal(decision.action,'store_items')
})
