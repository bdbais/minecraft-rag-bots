import test from 'node:test'
import assert from 'node:assert/strict'
import { autonomousProgressionDecision } from '../src/actions.js'

test('planner crafts a bow when string and sticks are available', () => {
  const bot={inventory:{items:()=>[{name:'crafting_table',count:1},{name:'string',count:3},{name:'stick',count:3}]},findBlock:()=>({name:'crafting_table'})}
  const decision=autonomousProgressionDecision(bot,{health:20,food:20,nearbyEntities:[],nearbyBlocks:[],equipment:[]},[])
  assert.equal(decision.action,'craft');assert.equal(decision.args.name,'bow')
})

test('planner replenishes arrows for an existing bow', () => {
  const bot={inventory:{items:()=>[{name:'crafting_table',count:1},{name:'bow',count:1},{name:'flint',count:4},{name:'feather',count:4},{name:'stick',count:4}]},findBlock:()=>({name:'crafting_table'})}
  const decision=autonomousProgressionDecision(bot,{health:20,food:20,nearbyEntities:[],nearbyBlocks:[],equipment:[]},[])
  assert.equal(decision.action,'craft');assert.equal(decision.args.name,'arrow')
})
