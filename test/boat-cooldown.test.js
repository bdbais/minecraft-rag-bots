import test from 'node:test'
import assert from 'node:assert/strict'
import { autonomousProgressionDecision } from '../src/actions.js'

test('planner does not relaunch a boat immediately after a successful crossing', () => {
  const bot={inventory:{items:()=>[
    {name:'oak_log',count:8},{name:'oak_boat',count:1},{name:'crafting_table',count:1},
    {name:'stone_pickaxe',count:1},{name:'stone_axe',count:1},{name:'stone_shovel',count:1},
    {name:'chest',count:1},{name:'furnace',count:1},{name:'torch',count:16},{name:'cobblestone',count:16}
  ]},findBlock:()=>null,registry:{blocksByName:{}},placeEntity:async()=>{},mount:async()=>{}}
  const state={health:20,food:20,nearbyEntities:[],nearbyBlocks:['water'],recentActions:[{action:'navigate_boat',success:true}]}
  const decision=autonomousProgressionDecision(bot,state,[])
  assert.notEqual(decision.action,'navigate_boat')
})
