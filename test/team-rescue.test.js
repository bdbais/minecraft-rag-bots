import test from 'node:test'
import assert from 'node:assert/strict'
import { autonomousProgressionDecision, execute } from '../src/actions.js'

test('bot prioritizes reaching a nearby teammate in critical condition', () => {
  const bot={inventory:{items:()=>[]},game:{dimension:'overworld'}}
  const decision=autonomousProgressionDecision(bot,{health:20,food:20,nearbyEntities:[{type:'player',username:'Grifa',health:4,distance:8}],nearbyBlocks:[]},[])
  assert.equal(decision.action,'follow_player')
  assert.equal(decision.args.username,'Grifa')
})

test('bot shares surplus food with an endangered nearby teammate first', () => {
  const bot={inventory:{items:()=>[{name:'bread',count:8}]},game:{dimension:'overworld'}}
  const decision=autonomousProgressionDecision(bot,{health:20,food:20,nearbyEntities:[{type:'player',username:'Grifa',health:4,distance:8}],nearbyBlocks:[]},[])
  assert.equal(decision.action,'give_item')
  assert.equal(decision.args.name,'bread')
})

test('bot does not repeatedly spend food after a recent rescue delivery', () => {
  const bot={inventory:{items:()=>[{name:'bread',count:8}]},game:{dimension:'overworld'}}
  const decision=autonomousProgressionDecision(bot,{health:20,food:20,recentActions:[{action:'give_item',success:true,target:'Grifa'}],nearbyEntities:[{type:'player',username:'Grifa',health:4,distance:8}],nearbyBlocks:[]},[])
  assert.equal(decision.action,'follow_player')
})

test('verified rescue food publishes a team checkpoint', async () => {
  const items=[{name:'bread',count:4}], checkpoints=[]
  const player={position:{x:3,y:64,z:1,distanceTo:()=>3}}
  const bot={entity:{position:{x:0,y:64,z:0}},players:{Grifa:{entity:player}},inventory:{items:()=>items},pathfinder:{goto:async()=>{}},toss:async()=>{items[0].count=3},game:{dimension:'overworld'}}
  await execute(bot,{action:'give_item',args:{username:'Grifa',name:'bread',count:1}},{onShareCheckpoint:async x=>checkpoints.push(x)})
  assert.equal(checkpoints[0].type,'resource')
  assert.match(checkpoints[0].label,/soccorso/i)
})
