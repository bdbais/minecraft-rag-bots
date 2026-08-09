import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { ChestMemory } from '../src/chest-memory.js'

test('chest memory preserves position and last observed contents',async()=>{const dir=await fs.mkdtemp(path.join(os.tmpdir(),'rag-chests-')),file=path.join(dir,'chests.json'),memory=new ChestMemory(file);await memory.load();await memory.record({x:12.8,y:64,z:-4.2},[{name:'oak_log',count:7}]);const restored=new ChestMemory(file);await restored.load();assert.equal(restored.list()[0].x,12);assert.deepEqual(restored.list()[0].contents,[{name:'oak_log',count:7}]);await fs.rm(dir,{recursive:true,force:true})})
