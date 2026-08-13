import test from 'node:test'
import assert from 'node:assert/strict'
import { autonomousProgressionDecision, execute } from '../src/actions.js'

test('planner crafts a bed when night arrives and wool is available', () => {
  const bot={inventory:{items:()=>[{name:'crafting_table',count:1},{name:'white_wool',count:3},{name:'oak_planks',count:3}]},findBlock:()=>null}
  const decision=autonomousProgressionDecision(bot,{time:14000,health:20,food:20,nearbyEntities:[],nearbyBlocks:[]},[])
  assert.equal(decision.action,'craft');assert.equal(decision.args.name,'bed')
})

test('sleep places an available bed before using it', async () => {
  let placed=false;const bot={entity:{position:{floored:()=>({x:0,y:64,z:0})}},inventory:{items:()=>[{name:'white_bed',count:1}]},findBlock:()=>placed?{name:'white_bed',position:{x:1,y:64,z:0}}:null,equip:async()=>{},blockAt:p=>p.y===63?{name:'stone',boundingBox:'block',position:p}:{name:placed?'white_bed':'air',boundingBox:placed?'block':'empty',position:p},placeBlock:async()=>{placed=true},pathfinder:{goto:async()=>{}},sleep:async()=>{}}
  const result=await execute(bot,{action:'sleep',args:{}})
  assert.equal(result,'notte superata dormendo al sicuro')
})
