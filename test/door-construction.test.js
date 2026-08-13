import test from 'node:test'
import assert from 'node:assert/strict'
import { execute } from '../src/actions.js'

test('build_door verifies the placed door at the shelter entrance', async () => {
  const blocks=new Map();const key=p=>`${p.x},${p.y},${p.z}`
  const bot={entity:{position:{floored:()=>({x:0,y:64,z:0})}},inventory:{items:()=>[{name:'oak_door',count:1}]},equip:async()=>{},blockAt:p=>p.y===63?{name:'stone',boundingBox:'block',position:p}:{name:blocks.get(key(p))||'air',boundingBox:blocks.has(key(p))?'block':'empty',position:p},placeBlock:async(b)=>{blocks.set(key({x:b.position.x,y:b.position.y+1,z:b.position.z}),'oak_door');blocks.set(key({x:b.position.x,y:b.position.y+2,z:b.position.z}),'oak_door')}}
  const result=await execute(bot,{action:'build_door',args:{}})
  assert.match(result,/porta costruita/)
})

test('build_door shares the protected entrance', async()=>{
  const blocks=new Map();const shared=[];const key=p=>`${p.x},${p.y},${p.z}`
  const bot={entity:{position:{floored:()=>({x:0,y:64,z:0})}},inventory:{items:()=>[{name:'oak_door',count:1}]},equip:async()=>{},blockAt:p=>p.y===63?{name:'stone',boundingBox:'block',position:p}:{name:blocks.get(key(p))||'air',boundingBox:blocks.has(key(p))?'block':'empty',position:p},placeBlock:async(b)=>{blocks.set(key({x:b.position.x,y:b.position.y+1,z:b.position.z}),'oak_door');blocks.set(key({x:b.position.x,y:b.position.y+2,z:b.position.z}),'oak_door')}}
  await execute(bot,{action:'build_door',args:{}},{onShareCheckpoint:x=>shared.push(x)})
  assert.equal(shared[0].type,'shelter_entrance')
})
