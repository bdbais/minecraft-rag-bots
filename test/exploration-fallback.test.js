import test from 'node:test'
import assert from 'node:assert/strict'
import { autonomousProgressionDecision } from '../src/actions.js'

test('planner keeps exploring when immediate survival goals are complete',()=>{
  const bot={inventory:{items:()=>[{name:'oak_planks',count:12},{name:'crafting_table',count:1},{name:'stone_pickaxe',count:1},{name:'stone_axe',count:1},{name:'chest',count:1}]},findBlock:()=>({name:'crafting_table'})}
  const decision=autonomousProgressionDecision(bot,{health:20,food:20,nearbyEntities:[],nearbyBlocks:[],equipment:[]},[{type:'base',label:'Riparo'}])
  assert.equal(decision.action,'explore'); assert.equal(decision.args.radius,24)
})
