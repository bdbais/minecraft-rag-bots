import test from 'node:test'
import assert from 'node:assert/strict'
import { autonomousProgressionDecision, execute } from '../src/actions.js'

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

test('planner explores before mining when no stone is visible',()=>{
  const bot={inventory:{items:()=>[
    {name:'crafting_table',count:1},{name:'stone_pickaxe',count:1},
    {name:'oak_log',count:4},{name:'chest',count:1},{name:'stone_axe',count:1}
  ]},findBlock:()=>null,registry:{blocksByName:{}}}
  const decision=autonomousProgressionDecision(bot,{health:20,food:20,nearbyEntities:[],nearbyBlocks:[]},[])
  assert.equal(decision.action,'explore')
})

test('planner mines visible iron after the stone reserve is ready',()=>{
  const bot={inventory:{items:()=>[{name:'crafting_table',count:1},{name:'iron_pickaxe',count:1},{name:'stone_axe',count:1},{name:'chest',count:1},{name:'furnace',count:1},{name:'oak_log',count:2},{name:'cobblestone',count:8}]},findBlock:()=>null,registry:{blocksByName:{}}}
  const decision=autonomousProgressionDecision(bot,{health:20,food:20,nearbyEntities:[],nearbyBlocks:['iron_ore']},[])
  assert.equal(decision.action,'collect_block')
  assert.equal(decision.args.name,'iron_ore')
})

test('planner investigates a visible diamond vein after basic progression',()=>{
  const bot={inventory:{items:()=>[{name:'crafting_table',count:1},{name:'iron_pickaxe',count:1},{name:'stone_axe',count:1},{name:'chest',count:1},{name:'furnace',count:1},{name:'oak_log',count:2},{name:'cobblestone',count:8}]},findBlock:()=>null,registry:{blocksByName:{}}}
  const decision=autonomousProgressionDecision(bot,{health:20,food:20,nearbyEntities:[],nearbyBlocks:['diamond_ore']},[])
  assert.equal(decision.action,'collect_block')
  assert.equal(decision.args.name,'diamond_ore')
})

test('collecting strategic ore shares its exact resource checkpoint', async()=>{
  const items=[{name:'iron_pickaxe',count:1}]
  const shared=[]
  const bot={
    inventory:{items:()=>items},
    findBlock:()=>({name:'diamond_ore',position:{x:12,y:-18,z:34}}),
    equip:async()=>{},
    collectBlock:{collect:async()=>items.push({name:'diamond',count:1})},
    entities:{},
    entity:{position:{x:12,y:-18,z:34}},
    game:{dimension:'minecraft:overworld'}
  }
  await execute(bot,{action:'collect_block',args:{name:'diamond_ore',count:1}},{onShareCheckpoint:async checkpoint=>shared.push(checkpoint)})
  assert.deepEqual(shared,[{type:'resource',label:'diamond_ore',x:12,y:-18,z:34,dimension:'minecraft:overworld',note:'risorsa individuata e raccolta',source:'mining'}])
})
