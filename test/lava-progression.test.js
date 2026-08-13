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
