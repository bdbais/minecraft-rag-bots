import test from 'node:test'
import assert from 'node:assert/strict'
import { autonomousProgressionDecision } from '../src/actions.js'

test('breeder does not consume feed in consecutive cycles', () => {
  const bot={inventory:{items:()=>[
    {name:'oak_planks',count:16},{name:'crafting_table',count:1},{name:'wheat',count:8}
  ]},findBlock:()=>null,registry:{blocksByName:{}}}
  const state={profession:'breeder',health:20,food:20,nearbyEntities:[
    {type:'mob',name:'cow'},{type:'mob',name:'cow'}
  ],nearbyBlocks:[],recentActions:[{action:'breed_animals',success:true}]}
  const decision=autonomousProgressionDecision(bot,state,[{type:'pen',label:'Recinto allevamento'}])
  assert.notEqual(decision.action,'breed_animals')
})
