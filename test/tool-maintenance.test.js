import test from 'node:test'
import assert from 'node:assert/strict'
import { autonomousProgressionDecision, execute } from '../src/actions.js'

test('autonomous planner replaces a nearly broken tool before exploration', () => {
  const bot = {
    inventory: { items: () => [{ name: 'crafting_table', count: 1 }, { name: 'iron_pickaxe', count: 1, durabilityUsed: 210, maxDurability: 250 }] },
    game: { gameMode: 'survival' },
    findBlock: () => null,
    registry: { blocksByName: { crafting_table: { id: 1 } } }
  }
  const decision = autonomousProgressionDecision(bot, { health: 20, food: 20, nearbyEntities: [], nearbyBlocks: [] })
  assert.equal(decision.action, 'craft')
  assert.equal(decision.args.name, 'iron_pickaxe')
  assert.equal(decision.args.replaceWorn, true)
})

test('craft replacement equips the fresh tool', async()=>{
  const equipped=[];let count=0;const bot={registry:{itemsByName:{iron_pickaxe:{id:1}},items:{1:{name:'iron_pickaxe'}},blocksByName:{crafting_table:{id:2}}},inventory:{items:()=>[{name:'iron_pickaxe',type:1,count:1}],count:()=>count},findBlock:()=>({name:'crafting_table'}),recipesFor:()=>[{result:{count:1},delta:[]}],craft:async()=>{count=1},equip:async(item,slot)=>equipped.push([item.name,slot])}
  await execute(bot,{action:'craft',args:{name:'iron_pickaxe',replaceWorn:true}})
  assert.deepEqual(equipped,[['iron_pickaxe','hand']])
})

test('normal tool crafting equips the new tool immediately', async()=>{
  const equipped=[];let count=0;const bot={registry:{itemsByName:{stone_pickaxe:{id:1}},items:{1:{name:'stone_pickaxe'}},blocksByName:{crafting_table:{id:2}}},inventory:{items:()=>[{name:'stone_pickaxe',type:1,count:1}],count:()=>count},findBlock:()=>({name:'crafting_table'}),recipesFor:()=>[{result:{count:1},delta:[]}],craft:async()=>{count=1},equip:async(item,slot)=>equipped.push([item.name,slot])}
  await execute(bot,{action:'craft',args:{name:'stone_pickaxe'}})
  assert.deepEqual(equipped,[['stone_pickaxe','hand']])
})
