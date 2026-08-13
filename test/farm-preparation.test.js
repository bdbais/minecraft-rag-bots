import test from 'node:test'
import assert from 'node:assert/strict'
import { autonomousProgressionDecision, execute } from '../src/actions.js'

test('planner prepares farmland when seeds, dirt and water are available',()=>{
  const bot={inventory:{items:()=>[{name:'wheat_seeds',count:2}]},findBlock:()=>null,registry:{blocksByName:{}}}
  const decision=autonomousProgressionDecision(bot,{health:20,food:20,nearbyEntities:[],nearbyBlocks:['dirt','water']},[])
  assert.equal(decision.action,'prepare_farm')
})

test('prepare_farm verifies that hoeing created farmland',async()=>{
  let tilled=false
  const soil={name:'dirt',position:{x:1,y:64,z:1}}
  const bot={inventory:{items:()=>[{name:'stone_hoe',count:1}]},findBlock:({matching})=>matching(soil)?soil:{name:'water',position:{x:2,y:64,z:1}},pathfinder:{goto:async()=>{}},equip:async()=>{},activateBlock:async()=>{tilled=true},blockAt:()=>({name:tilled?'farmland':'dirt'})}
  const result=await execute(bot,{action:'prepare_farm',args:{}})
  assert.match(result,/campo preparato/i)
})
