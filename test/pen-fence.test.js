import test from 'node:test'
import assert from 'node:assert/strict'
import { execute } from '../src/actions.js'

test('build_pen prefers real fence material when available', async () => {
  const placed=[];const occupied=new Set();const key=p=>`${p.x},${p.y},${p.z}`;const bot={entity:{position:{floored:()=>({x:0,y:64,z:0})}},inventory:{items:()=>[{name:'oak_fence',count:16}]},equip:async()=>{},blockAt:p=>p.y===63?{name:'grass_block',boundingBox:'block',position:p}:{name:occupied.has(key(p))?'oak_fence':'air',boundingBox:occupied.has(key(p))?'block':'empty',position:p},placeBlock:async(b)=>{const p={x:b.position.x,y:b.position.y+1,z:b.position.z};occupied.add(key(p));placed.push(b)} }
  const result=await execute(bot,{action:'build_pen',args:{}})
  assert.match(result,/recinto costruito/);assert.ok(placed.length>=4)
})
