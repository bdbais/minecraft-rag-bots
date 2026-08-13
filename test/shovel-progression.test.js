import test from 'node:test'
import assert from 'node:assert/strict'
import { autonomousProgressionDecision } from '../src/actions.js'

test('planner crafts a shovel when terrain makes it useful',()=>{
  const bot={inventory:{items:()=>[{name:'crafting_table',count:1},{name:'oak_planks',count:8},{name:'stone_pickaxe',count:1},{name:'stone_axe',count:1},{name:'chest',count:1}]},findBlock:()=>null,registry:{blocksByName:{}}}
  const decision=autonomousProgressionDecision(bot,{health:20,food:20,nearbyEntities:[],nearbyBlocks:['dirt']},[{type:'base',label:'Riparo'}])
  assert.equal(decision.action,'craft')
  assert.equal(decision.args.name,'shovel')
})
