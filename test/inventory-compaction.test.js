import test from 'node:test'
import assert from 'node:assert/strict'
import { execute } from '../src/actions.js'

test('material actions compact duplicate stacks before collecting',async()=>{
  let moves=0,items=[{name:'stone',count:1,type:1}]
  const slots=[{type:1,metadata:0},{type:1,metadata:0}]
  const bot={inventory:{slots,items:()=>items},findBlock:()=>({name:'stone'}),collectBlock:{collect:async()=>{items=[{name:'stone',count:2,type:1}]}},moveSlotItem:async()=>{moves++}}
  await execute(bot,{action:'collect_block',args:{name:'stone',count:1}})
  assert.equal(moves,1)
})

test('inventory compaction keeps NBT variants separate',async()=>{
  let moves=0,items=[{name:'stone',count:1,type:1}]
  const slots=[{type:1,metadata:0,nbt:{Enchantments:[1]}},{type:1,metadata:0,nbt:{Enchantments:[2]}}]
  const bot={inventory:{slots,items:()=>items},findBlock:()=>({name:'stone'}),collectBlock:{collect:async()=>{items=[{name:'stone',count:2,type:1}]}},moveSlotItem:async()=>{moves++}}
  await execute(bot,{action:'collect_block',args:{name:'stone',count:1}})
  assert.equal(moves,0)
})
