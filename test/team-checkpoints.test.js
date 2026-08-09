import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { TeamCheckpoints } from '../src/team-checkpoints.js'
import { execute } from '../src/actions.js'

test('team checkpoints persist and merge nearby reports',async()=>{const dir=await fs.mkdtemp(path.join(os.tmpdir(),'checkpoint-')),file=path.join(dir,'team.json'),store=new TeamCheckpoints(file,'localhost:25565');await store.publish({type:'chest',label:'Chest quercia',x:10,y:64,z:20,reporter:'Ada'});await store.publish({type:'chest',label:'Chest confermata',x:12,y:64,z:19,reporter:'Leo'});assert.equal(store.list().length,1);assert.deepEqual(store.list()[0].reporters,['Ada','Leo']);const restored=new TeamCheckpoints(file,'localhost:25565');await restored.load();assert.equal(restored.list()[0].x,12);await fs.rm(dir,{recursive:true,force:true})})

test('agent can publish its current position as a checkpoint',async()=>{let shared;const result=await execute({entity:{position:{x:4,y:65,z:-8}},game:{dimension:'overworld'}},{action:'share_checkpoint',args:{type:'mine',label:'Ingresso miniera',note:'ferro visibile'}},{onShareCheckpoint:async value=>{shared=value;return value}});assert.equal(shared.x,4);assert.equal(shared.type,'mine');assert.match(result,/checkpoint condiviso/)})
