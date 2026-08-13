import test from 'node:test'
import assert from 'node:assert/strict'
import { autonomousProgressionDecision } from '../src/actions.js'

test('planner uses a pickaxe to mine stone before wandering', () => {
  const bot={
    inventory:{items:()=>[
      {name:'crafting_table',count:1},
      {name:'stone_pickaxe',count:1},
      {name:'oak_log',count:4},
      {name:'chest',count:1},
      {name:'stone_axe',count:1}
    ]},
    findBlock:()=>null,
    registry:{blocksByName:{}}
  }
  const decision=autonomousProgressionDecision(bot,{health:20,food:20,nearbyEntities:[],nearbyBlocks:['stone']},[])
  assert.equal(decision.action,'collect_block')
  assert.equal(decision.args.name,'stone')
  assert.equal(decision.args.count,8)
})

test('planner does not remine stone once the reserve is ready', () => {
  const bot={
    inventory:{items:()=>[
      {name:'crafting_table',count:1},
      {name:'stone_pickaxe',count:1},
      {name:'cobblestone',count:8}
    ]},
    findBlock:()=>null,
    registry:{blocksByName:{}}
  }
  const decision=autonomousProgressionDecision(bot,{health:20,food:20,nearbyEntities:[],nearbyBlocks:[]},[])
  assert.notEqual(decision.action,'collect_block')
})
