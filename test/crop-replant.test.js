import test from 'node:test'
import assert from 'node:assert/strict'
import { execute } from '../src/actions.js'

test('harvest_crops replants wheat seeds on farmland when possible', async () => {
  let wheat=0;let replanted=false
  const bot={entity:{position:{distanceTo:()=>1}},inventory:{items:()=>[{name:'wheat_seeds',count:1},{name:'wheat',count:wheat}]},findBlocks:()=>[{x:1,y:64,z:1}],blockAt:p=>p.y===63?{name:'farmland',boundingBox:'block',position:p}:{name:'wheat',position:p,getProperties:()=>({age:7})},pathfinder:{goto:async()=>{}},dig:async()=>{wheat=1},equip:async()=>{},placeBlock:async()=>{replanted=true}}
  await execute(bot,{action:'harvest_crops',args:{count:1}})
  assert.equal(replanted,true)
})
