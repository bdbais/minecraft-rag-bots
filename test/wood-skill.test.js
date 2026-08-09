import test from 'node:test'
import assert from 'node:assert/strict'
import { execute } from '../src/actions.js'

test('collect_wood accepts mixed Minecraft log species',async()=>{let index=0,items=[];const positions=[{id:1,x:1,y:64,z:0},{id:2,x:2,y:64,z:0}],names=['birch_log','cherry_log'],position={x:0,y:64,z:0,distanceTo:p=>Math.hypot(p.x,p.y-64,p.z)};const bot={entity:{position},inventory:{items:()=>items},entities:{},findBlocks:()=>[positions[Math.min(index,1)]],blockAt:p=>({name:names[Math.min(index,1)],position:{...p,distanceTo:position.distanceTo}}),collectBlock:{collect:async target=>{if(target?.name){items.push({name:target.name,count:1});index++}}}};const result=await execute(bot,{action:'collect_wood',args:{count:2}});assert.equal(items.length,2);assert.match(result,/birch_log/);assert.match(result,/cherry_log/)})
