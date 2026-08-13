import test from 'node:test'
import assert from 'node:assert/strict'
import { autonomousProgressionDecision } from '../src/actions.js'

test('team prioritizes a rescue checkpoint over ordinary exploration', () => {
  const bot={inventory:{items:()=>[{name:'stone_pickaxe',count:1},{name:'stone_axe',count:1},{name:'stone_shovel',count:1},{name:'crafting_table',count:1},{name:'chest',count:1},{name:'furnace',count:1},{name:'oak_log',count:8},{name:'cobblestone',count:8},{name:'torch',count:16}]},entity:{position:{x:0,y:64,z:0}},game:{dimension:'overworld'},findBlock:()=>null}
  const decision=autonomousProgressionDecision(bot,{health:20,food:20,nearbyEntities:[],nearbyBlocks:[],recentActions:[]},[{type:'base',label:'Riparo',x:0,y:64,z:0,dimension:'overworld'},{type:'resource',label:'Punto soccorso: Grifa',x:12,y:64,z:4,dimension:'overworld'}])
  assert.equal(decision.action,'move_to')
  assert.match(decision.goal,/soccorso/i)
})
