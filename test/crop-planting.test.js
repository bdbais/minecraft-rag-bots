import test from 'node:test'
import assert from 'node:assert/strict'
import { autonomousProgressionDecision, execute } from '../src/actions.js'

test('planner starts a renewable farm when seeds and farmland are visible',()=>{
  const bot={inventory:{items:()=>[{name:'wheat_seeds',count:3}]},findBlock:()=>null,findBlocks:()=>[],registry:{blocksByName:{}}}
  const decision=autonomousProgressionDecision(bot,{health:20,food:20,nearbyEntities:[],nearbyBlocks:['farmland']},[])
  assert.equal(decision.action,'plant_crops')
  assert.equal(decision.args.count,3)
})

test('plant_crops equips seeds and verifies planted blocks',async()=>{
  let seeds=2,planted=0
  const bot={
    entity:{position:{distanceTo:()=>1}},
    inventory:{items:()=>[{name:'wheat_seeds',count:seeds}]},
    findBlocks:()=>[{x:1,y:64,z:1}],
    blockAt:p=>p.y===64?{name:'farmland',boundingBox:'block',position:p}:{name:planted?'wheat':'air',boundingBox:planted?'block':'empty',position:p},
    equip:async()=>{},
    placeBlock:async()=>{planted++;seeds--}
  }
  let shared=null
  const result=await execute(bot,{action:'plant_crops',args:{count:1}},{onShareCheckpoint:x=>{shared=x}})
  assert.match(result,/piantate 1/i)
  assert.equal(seeds,1)
  assert.equal(shared.type,'resource')
})
