import test from 'node:test'
import assert from 'node:assert/strict'
import { Vec3 } from 'vec3'
import { simulateLavaDefense } from '../src/actions.js'

test('lava simulation rejects a flow that reaches protected blocks',()=>{
  const source=new Vec3(10,64,10), protectedPos=new Vec3(11,64,10)
  const bot={blockAt:p=>p.x===protectedPos.x&&p.z===protectedPos.z?{name:'chest'}:{name:'stone'}}
  const result=simulateLavaDefense(bot,source,{maxCells:8,minDistance:0})
  assert.equal(result.safe,false); assert.ok(result.unsafe.some(x=>x.reason==='chest'))
})
