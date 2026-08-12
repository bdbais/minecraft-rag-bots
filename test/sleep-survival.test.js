import test from 'node:test'
import assert from 'node:assert/strict'
import { autonomousProgressionDecision, execute } from '../src/actions.js'

test('planner sleeps at a nearby bed during the night', () => {
  const bot={inventory:{items:()=>[]},game:{gameMode:'survival'},findBlock:()=>({name:'white_bed',position:{x:1,y:64,z:0}})}
  const decision=autonomousProgressionDecision(bot,{health:20,food:20,time:14000,nearbyEntities:[],nearbyBlocks:['white_bed']})
  assert.equal(decision.action,'sleep')
})

test('sleep reaches the bed and uses the client sleep API', async () => {
  let slept=false
  const bed={name:'white_bed',position:{x:1,y:64,z:0}}
  const bot={entity:{position:{distanceTo:()=>1}},findBlock:()=>bed,pathfinder:{goto:async()=>{}},sleep:async target=>{slept=target===bed}}
  const result=await execute(bot,{action:'sleep',args:{}})
  assert.equal(slept,true);assert.match(result,/notte superata/)
})
