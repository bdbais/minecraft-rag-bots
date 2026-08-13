import test from 'node:test'
import assert from 'node:assert/strict'
import { autonomousProgressionDecision } from '../src/actions.js'

const bot=items=>({inventory:{items:()=>items},game:{gameMode:'survival'},findBlock:()=>null,registry:{blocksByName:{}}})

test('planner collects lava after a bucket is available',()=>{
  const decision=autonomousProgressionDecision(bot([{name:'crafting_table',count:1},{name:'bucket',count:1}]),{health:20,food:20,nearbyEntities:[],nearbyBlocks:['lava']},[])
  assert.equal(decision.action,'collect_fluid')
  assert.equal(decision.args.fluid,'lava')
})

test('planner prefers water when both fluids are visible',()=>{
  const decision=autonomousProgressionDecision(bot([{name:'crafting_table',count:1},{name:'bucket',count:1}]),{health:20,food:20,nearbyEntities:[],nearbyBlocks:['water','lava']},[])
  assert.equal(decision.action,'collect_fluid')
  assert.equal(decision.args.fluid,'water')
})

test('planner builds a Nether portal when obsidian and flint steel are ready',()=>{
  const decision=autonomousProgressionDecision(bot([{name:'crafting_table',count:1},{name:'stone_pickaxe',count:1},{name:'stone_axe',count:1},{name:'chest',count:1},{name:'furnace',count:1},{name:'oak_log',count:2},{name:'cobblestone',count:8},{name:'obsidian',count:10},{name:'flint_and_steel',count:1}]),{health:20,food:20,nearbyEntities:[],nearbyBlocks:[]},[])
  assert.equal(decision.action,'build_portal')
})
