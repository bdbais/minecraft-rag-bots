import test from 'node:test'
import assert from 'node:assert/strict'
import { autonomousProgressionDecision } from '../src/actions.js'

test('planner travels to a visible high-value point of interest',()=>{
  const bot={inventory:{items:()=>[{name:'crafting_table',count:1},{name:'oak_log',count:4},{name:'stone_pickaxe',count:1},{name:'stone_axe',count:1},{name:'chest',count:1}]},findBlock:()=>null,registry:{blocksByName:{}}}
  const decision=autonomousProgressionDecision(bot,{health:20,food:20,nearbyEntities:[],nearbyBlocks:[],visibleTargets:[{name:'diamond_ore',x:12,y:20,z:-4,distance:13}]},[{type:'base',label:'Riparo'}])
  assert.equal(decision.action,'move_to')
  assert.deepEqual(decision.args,{x:12,y:20,z:-4,range:2})
})

test('planner never navigates directly into visible fluids',()=>{
  const bot={inventory:{items:()=>[{name:'crafting_table',count:1},{name:'oak_log',count:4},{name:'stone_pickaxe',count:1},{name:'stone_axe',count:1},{name:'chest',count:1}]},findBlock:()=>null,registry:{blocksByName:{}}}
  const decision=autonomousProgressionDecision(bot,{health:20,food:20,nearbyEntities:[],nearbyBlocks:[],visibleTargets:[{name:'lava',x:12,y:20,z:-4,distance:13}]},[{type:'base',label:'Riparo'}])
  assert.notEqual(decision.action,'move_to')
})

test('planner avoids an unprotected spawner',()=>{
  const bot={inventory:{items:()=>[{name:'crafting_table',count:1},{name:'oak_log',count:4},{name:'stone_pickaxe',count:1},{name:'chest',count:1}]},findBlock:()=>null,registry:{blocksByName:{}}}
  const decision=autonomousProgressionDecision(bot,{health:20,food:20,nearbyEntities:[],nearbyBlocks:[],visibleTargets:[{name:'spawner',x:8,y:20,z:8,distance:12}]},[{type:'base',label:'Riparo'}])
  assert.notEqual(decision.action,'move_to')
})
