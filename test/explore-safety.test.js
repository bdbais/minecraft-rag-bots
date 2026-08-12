import test from 'node:test'
import assert from 'node:assert/strict'
import { execute } from '../src/actions.js'

test('exploration path avoids fluid blocks and does not dig',async()=>{let movement;const bot={entity:{position:{x:0,y:64,z:0}},registry:{blocksByName:{lava:{id:10},water:{id:11}}},pathfinder:{setMovements:m=>movement=m,goto:async()=>{} }};await execute(bot,{action:'explore',args:{radius:8}});assert.equal(movement.canDig,false);assert.deepEqual([...movement.blocksToAvoid].sort((a,b)=>a-b),[10,11])})
