import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { LineageStore } from '../src/lineage.js'
test('lineage blends parent traits and persists',async()=>{const d=await fs.mkdtemp(path.join(os.tmpdir(),'lineage-')),s=new LineageStore(path.join(d,'lineage.json'));const c=s.conceive({id:'a',name:'A',strength:16,personality:'builder'},{id:'b',name:'B',strength:8,personality:'explorer'});assert.equal(c.parents.length,2);assert.ok(c.stats.strength>=6&&c.stats.strength<=16);await s.save();const loaded=await new LineageStore(s.file).load();assert.equal(loaded.generations.length,1)})
