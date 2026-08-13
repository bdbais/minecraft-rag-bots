import test from 'node:test'
import assert from 'node:assert/strict'
import { autonomousProgressionDecision, execute } from '../src/actions.js'

test('planner smelts raw iron when a furnace and fuel are available', () => {
  const bot={inventory:{items:()=>[{name:'raw_iron',count:3},{name:'coal',count:2}]},game:{gameMode:'survival'},findBlock:()=>({name:'furnace',position:{x:0,y:64,z:0}})}
  const decision=autonomousProgressionDecision(bot,{health:20,food:20,nearbyEntities:[],nearbyBlocks:['furnace']})
  assert.equal(decision.action,'smelt');assert.equal(decision.args.name,'raw_iron')
})

test('planner uses a crafted furnace from inventory on the next cycle', () => {
  const bot={inventory:{items:()=>[{name:'furnace',count:1},{name:'raw_iron',count:2},{name:'coal',count:2}]},findBlock:()=>null}
  const decision=autonomousProgressionDecision(bot,{nearbyBlocks:[],nearbyEntities:[],equipment:[]},[])
  assert.equal(decision.action,'smelt')
})

test('smelt opens a nearby furnace and loads input and fuel', async () => {
  const calls=[]
  const bot={entity:{position:{distanceTo:()=>1}},inventory:{items:()=>[{name:'raw_iron',type:1,count:2},{name:'coal',type:2,count:2}]},findBlock:()=>({name:'furnace',position:{x:0,y:64,z:0}}),pathfinder:{goto:async()=>{}},openFurnace:async()=>({putFuel:async(...x)=>calls.push(['fuel',...x]),putInput:async(...x)=>calls.push(['input',...x]),outputItem:()=>({name:'iron',count:1}),close:()=>{}})}
  const result=await execute(bot,{action:'smelt',args:{name:'raw_iron',count:1,waitMs:1}})
  assert.match(result,/fusione/);assert.deepEqual(calls,[['fuel',2,1],['input',1,1]])
})

test('smelt with lava requires the empty bucket to return',async()=>{
  let returned=false
  const items=()=>[{name:'raw_iron',type:1,count:1},{name:'lava_bucket',type:3,count:1},...(returned?[{name:'bucket',type:4,count:1}]:[])]
  const bot={entity:{position:{distanceTo:()=>1}},inventory:{items},findBlock:()=>({name:'furnace',position:{x:0,y:64,z:0}}),pathfinder:{goto:async()=>{}},openFurnace:async()=>({putFuel:async()=>{returned=true},putInput:async()=>{},outputItem:()=>({name:'iron',count:1}),close:()=>{}})}
  const result=await execute(bot,{action:'smelt',args:{name:'raw_iron',count:1,waitMs:1}})
  assert.match(result,/fusione/)
})
