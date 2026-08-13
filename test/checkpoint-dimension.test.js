import test from 'node:test'
import assert from 'node:assert/strict'
import { autonomousProgressionDecision } from '../src/actions.js'

test('planner ignores checkpoints from another dimension',()=>{
  const bot={game:{dimension:'the_nether'},inventory:{items:()=>[
    {name:'crafting_table',count:1},{name:'oak_log',count:4},
    {name:'stone_pickaxe',count:1},{name:'stone_axe',count:1},{name:'chest',count:1}
  ]},findBlock:()=>null,registry:{blocksByName:{}}}
  const decision=autonomousProgressionDecision(bot,{health:20,food:20,nearbyEntities:[],nearbyBlocks:[],visibleTargets:[]},[
    {type:'resource',label:'Miniera Overworld',dimension:'overworld',x:100,y:20,z:100},
    {type:'resource',label:'Miniera Nether',dimension:'the_nether',x:8,y:20,z:8}
  ])
  assert.notEqual(decision.action,'move_to')
  assert.notEqual(decision.args?.poi,'Miniera Overworld')
})
