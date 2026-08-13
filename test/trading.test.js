import test from 'node:test'
import assert from 'node:assert/strict'
import { autonomousProgressionDecision, execute } from '../src/actions.js'

test('trader selects a nearby villager instead of only chatting with players', () => {
  const bot={inventory:{items:()=>[{name:'coal',count:8}]},game:{dimension:'overworld'},openVillager:async()=>{},findBlock:()=>null}
  const decision=autonomousProgressionDecision(bot,{profession:'trader',health:20,food:20,nearbyEntities:[{type:'mob',name:'villager'}],nearbyBlocks:[]},[])
  assert.equal(decision.action,'trade')
})

test('trade verifies that the villager output enters the inventory', async () => {
  const villager={type:'mob',name:'villager',position:{x:2,y:64,z:0,distanceTo:()=>2}}
  const items=[{name:'coal',count:8}]
  const window={trades:[{inputItem1:{name:'coal',count:2},inputItem2:null,outputItem:{name:'emerald',count:1},tradeDisabled:false,maximumNbTradeUses:8}],close(){}}
  const bot={entity:{position:{x:0,y:64,z:0}},entities:{villager},inventory:{items:()=>items},pathfinder:{goto:async()=>{}},openVillager:async()=>window,trade:async()=>{items.push({name:'emerald',count:1})}}
  const result=await execute(bot,{action:'trade',args:{times:1}})
  assert.match(result,/emerald/)
})
