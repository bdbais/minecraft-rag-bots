import test from 'node:test'
import assert from 'node:assert/strict'
import { autonomousProgressionDecision } from '../src/actions.js'

test('planner crafts normal torches before underground exploration', () => {
  const bot={inventory:{items:()=>[{name:'crafting_table',count:1},{name:'coal',count:2},{name:'stick',count:8}]},findBlock:()=>({name:'crafting_table'})}
  const decision=autonomousProgressionDecision(bot,{health:20,food:20,nearbyEntities:[],nearbyBlocks:[],equipment:[]},[])
  assert.equal(decision.action,'craft');assert.equal(decision.args.name,'torch')
})
