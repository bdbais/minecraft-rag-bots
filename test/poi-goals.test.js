import test from 'node:test'
import assert from 'node:assert/strict'
import { autonomousProgressionDecision } from '../src/actions.js'

test('planner travels to a visible high-value point of interest',()=>{
  const bot={inventory:{items:()=>[{name:'crafting_table',count:1},{name:'oak_log',count:4},{name:'stone_pickaxe',count:1},{name:'stone_axe',count:1},{name:'chest',count:1}]},findBlock:()=>null,registry:{blocksByName:{}}}
  const decision=autonomousProgressionDecision(bot,{health:20,food:20,nearbyEntities:[],nearbyBlocks:[],visibleTargets:[{name:'diamond_ore',x:12,y:20,z:-4,distance:13}]},[{type:'base',label:'Riparo'}])
  assert.equal(decision.action,'move_to')
  assert.deepEqual(decision.args,{x:12,y:20,z:-4,range:2,poi:'diamond_ore'})
})

test('planner never navigates directly into visible fluids',()=>{
  const bot={inventory:{items:()=>[{name:'crafting_table',count:1},{name:'oak_log',count:4},{name:'stone_pickaxe',count:1},{name:'stone_axe',count:1},{name:'chest',count:1}]},findBlock:()=>null,registry:{blocksByName:{}}}
  const decision=autonomousProgressionDecision(bot,{health:20,food:20,nearbyEntities:[],nearbyBlocks:[],visibleTargets:[{name:'lava',x:12,y:20,z:-4,distance:13}]},[{type:'base',label:'Riparo'}])
  assert.notEqual(decision.action,'move_to')
})

test('move_to publishes a reached POI to team memory',async()=>{
  const shared=[]
  const bot={entity:{position:{distanceTo:()=>1}},pathfinder:{goto:async()=>{}},game:{dimension:'overworld'}}
  await (await import('../src/actions.js')).execute(bot,{action:'move_to',args:{x:4,y:64,z:8,range:2,poi:'diamond_ore'}},{onShareCheckpoint:async value=>shared.push(value)})
  assert.equal(shared[0].type,'poi')
  assert.equal(shared[0].label,'diamond_ore')
})

test('planner avoids an unprotected spawner',()=>{
  const bot={inventory:{items:()=>[{name:'crafting_table',count:1},{name:'oak_log',count:4},{name:'stone_pickaxe',count:1},{name:'chest',count:1}]},findBlock:()=>null,registry:{blocksByName:{}}}
  const decision=autonomousProgressionDecision(bot,{health:20,food:20,nearbyEntities:[],nearbyBlocks:[],visibleTargets:[{name:'spawner',x:8,y:20,z:8,distance:12}]},[{type:'base',label:'Riparo'}])
  assert.notEqual(decision.action,'move_to')
})

test('planner asks a nearby teammate for help before approaching danger',()=>{
  const bot={username:'Grifa',inventory:{items:()=>[{name:'crafting_table',count:1},{name:'oak_log',count:4},{name:'stone_pickaxe',count:1},{name:'chest',count:1}]},findBlock:()=>null,registry:{blocksByName:{}}}
  const decision=autonomousProgressionDecision(bot,{health:20,food:20,nearbyEntities:[{type:'player',username:'Mattew'}],nearbyBlocks:[],visibleTargets:[{name:'spawner',x:8,y:20,z:8,distance:12}]},[{type:'base',label:'Riparo'}])
  assert.equal(decision.action,'chat')
  assert.match(decision.args.message,/Mattew/)
})
