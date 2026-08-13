import test from 'node:test'
import assert from 'node:assert/strict'
import { autonomousProgressionDecision } from '../src/actions.js'

test('planner shares surplus food with a nearby player',()=>{
  const bot={username:'Grifa',inventory:{items:()=>[
    {name:'crafting_table',count:1},{name:'oak_log',count:4},
    {name:'stone_pickaxe',count:1},{name:'chest',count:1},
    {name:'stone_axe',count:1},{name:'bread',count:12}
  ]},findBlock:()=>null,registry:{blocksByName:{}}}
  const decision=autonomousProgressionDecision(bot,{health:20,food:20,nearbyEntities:[{type:'player',username:'Alex'}],nearbyBlocks:[]},[{type:'base',label:'Riparo'}])
  assert.equal(decision.action,'give_item')
  assert.equal(decision.args.username,'Alex')
  assert.equal(decision.args.name,'bread')
})

test('planner never gives away the last food reserve',()=>{
  const bot={username:'Grifa',inventory:{items:()=>[
    {name:'crafting_table',count:1},{name:'oak_log',count:4},
    {name:'stone_pickaxe',count:1},{name:'chest',count:1},
    {name:'stone_axe',count:1},{name:'bread',count:2}
  ]},findBlock:()=>null,registry:{blocksByName:{}}}
  const decision=autonomousProgressionDecision(bot,{health:20,food:20,nearbyEntities:[{type:'player',username:'Alex'}],nearbyBlocks:[]},[{type:'base',label:'Riparo'}])
  assert.notEqual(decision.action,'give_item')
})

test('planner shares surplus torches with a nearby player',()=>{
  const bot={username:'Grifa',inventory:{items:()=>[{name:'crafting_table',count:1},{name:'oak_log',count:4},{name:'stone_pickaxe',count:1},{name:'stone_axe',count:1},{name:'chest',count:1},{name:'torch',count:24}]},findBlock:()=>null,registry:{blocksByName:{}}}
  const decision=autonomousProgressionDecision(bot,{health:20,food:20,nearbyEntities:[{type:'player',username:'Alex'}],nearbyBlocks:[]},[{type:'base',label:'Riparo'}])
  assert.equal(decision.action,'give_item');assert.equal(decision.args.name,'torch');assert.ok(decision.args.count<=4)
})
