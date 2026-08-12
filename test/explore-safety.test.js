import test from 'node:test'
import assert from 'node:assert/strict'
import { execute } from '../src/actions.js'

test('exploration path avoids fluid blocks and does not dig',async()=>{let movement;const names=['lava','water','fire','chest','sand','gravel','ladder'];const blocksByName=Object.fromEntries(names.map((name,i)=>[name,{id:i+10}]));const bot={entity:{position:{x:0,y:64,z:0}},registry:{blocksByName,blocksArray:[]},pathfinder:{setMovements:m=>movement=m,goto:async()=>{} }};await execute(bot,{action:'explore',args:{radius:8}});assert.equal(movement.canDig,false);assert.ok(movement.blocksToAvoid.has(10));assert.ok(movement.blocksToAvoid.has(11))})
