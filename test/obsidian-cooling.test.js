import test from 'node:test'
import assert from 'node:assert/strict'
import { autonomousProgressionDecision, execute } from '../src/actions.js'

test('planner cools visible lava when a water bucket is ready',()=>{
  const bot={inventory:{items:()=>[{name:'water_bucket',count:1}]},findBlock:()=>null,registry:{blocksByName:{}}}
  const decision=autonomousProgressionDecision(bot,{health:20,food:20,nearbyEntities:[],nearbyBlocks:['lava']},[])
  assert.equal(decision.action,'cool_lava')
})

test('cool_lava verifies that the source became a solid block',async()=>{
  let cooled=false
  const lava={name:'lava',position:{x:1,y:64,z:1}}
  const bot={
    entity:{position:{distanceTo:()=>1}},
    inventory:{items:()=>[{name:'water_bucket',count:1}]},
    findBlock:()=>lava,
    blockAt:()=>({name:cooled?'obsidian':'lava'}),
    pathfinder:{goto:async()=>{}},equip:async()=>{},activateBlock:async()=>{cooled=true}
  }
  const result=await execute(bot,{action:'cool_lava',args:{}})
  assert.match(result,/ossidiana/i)
})
