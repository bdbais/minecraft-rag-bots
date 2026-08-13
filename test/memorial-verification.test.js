import test from 'node:test'
import assert from 'node:assert/strict'
import { execute } from '../src/actions.js'

test('build_memorial verifies that the memorial block exists', async () => {
  const placed = new Set(); const key=p=>`${p.x},${p.y},${p.z}`
  const bot={
    entity:{position:{floored:()=>({x:0,y:64,z:0})}},
    inventory:{items:()=>[{name:'stone',count:6}]},equip:async()=>{},
    blockAt:p=>p.y===63?{name:'stone',boundingBox:'block',position:p}:{name:placed.has(key(p))?'stone':'air',boundingBox:placed.has(key(p))?'block':'empty',position:p},
    placeBlock:async(b,face)=>{placed.add(key({x:b.position.x,y:b.position.y+face.y,z:b.position.z}))}
  }
  const result=await execute(bot,{action:'build_memorial',args:{name:'Alex'}})
  assert.match(result,/memoriale costruito/)
})
