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

test('shared social goals merge supporters instead of duplicating goals',()=>{const s=new SocialMemory('unused');const a=s.proposeGoal('trovare il dungeon','Alex'),b=s.proposeGoal('trovare il dungeon','Grifa');assert.equal(a.id,b.id);assert.deepEqual(b.supporters.sort(),['Alex','Grifa'])})
test('completed social goals leave the active queue',()=>{const s=new SocialMemory('unused');s.proposeGoal('costruire una base','Alex');const done=s.completeGoal('costruire una base','Grifa');assert.equal(done.completedBy,'Grifa');assert.equal(s.openGoals().length,0)})
