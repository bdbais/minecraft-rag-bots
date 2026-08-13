import test from 'node:test'
import assert from 'node:assert/strict'
import { execute } from '../src/actions.js'

test('equip verifies the held item when the client exposes heldItem', async()=>{
  const bot={heldItem:null,inventory:{items:()=>[{name:'stone_pickaxe',count:1}]},equip:async item=>{bot.heldItem=item}}
  const result=await execute(bot,{action:'equip',args:{name:'stone_pickaxe',destination:'hand'}})
  assert.equal(result,'equipped stone_pickaxe')
})
