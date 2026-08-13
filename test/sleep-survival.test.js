import test from 'node:test'
import assert from 'node:assert/strict'
import { autonomousProgressionDecision, execute } from '../src/actions.js'

test('planner sleeps at a nearby bed during the night', () => {
  const bot={inventory:{items:()=>[]},game:{gameMode:'survival'},findBlock:()=>({name:'white_bed',position:{x:1,y:64,z:0}})}
  const decision=autonomousProgressionDecision(bot,{health:20,food:20,time:14000,nearbyEntities:[],nearbyBlocks:['white_bed']})
  assert.equal(decision.action,'sleep')
})

test('planner returns to a base at night when an unprotected bot sees a hostile mob', () => {
  const bot={entity:{position:{x:20,y:64,z:0}},inventory:{items:()=>[]},game:{gameMode:'survival'}}
  const decision=autonomousProgressionDecision(bot,{time:14000,health:20,food:20,nearbyEntities:[{type:'mob',name:'zombie',distance:8}],nearbyBlocks:[]},[{type:'base',label:'Base notturna',x:18,y:64,z:0}])
  assert.equal(decision.action,'move_to')
  assert.equal(decision.args.poi,'Base notturna')
})

test('sleep reaches the bed and uses the client sleep API', async () => {
  let slept=false
  const bed={name:'white_bed',position:{x:1,y:64,z:0}}
  const bot={entity:{position:{distanceTo:()=>1}},findBlock:()=>bed,pathfinder:{goto:async()=>{}},sleep:async target=>{slept=target===bed}}
  const result=await execute(bot,{action:'sleep',args:{}})
  assert.equal(slept,true);assert.match(result,/notte superata/)
})
