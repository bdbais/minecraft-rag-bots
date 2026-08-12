import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { SocialMemory } from '../src/social-memory.js'

test('social memory persists karma and shared goals', async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'mrb-social-')),file=path.join(dir,'social.json')
  const memory=new SocialMemory(file);await memory.load();memory.remember('Aris',{good:true,memory:'ha condiviso del cibo'});memory.remember('Aris',{bad:true});memory.proposeGoal('fondare una città','Aris');await memory.save()
  const restored=await new SocialMemory(file).load();assert.equal(restored.people.Aris.encounters,2);assert.ok(restored.people.Aris.karma<1);assert.equal(restored.openGoals()[0].title,'fondare una città')
})
