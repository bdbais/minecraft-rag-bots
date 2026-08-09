import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { Biography, recoverBiographyText } from '../src/biography.js'

test('a truncated biography recovers every complete event',()=>{const text=`{"identity":{"name":"Kate"},"milestones":{},"sessions":[{"id":"s1"}],"events":[{"id":"e1","text":"braces { inside string"},{"id":"e2","data":{"ok":true}},{"id":"broken","data":`;const recovered=recoverBiographyText(text);assert.equal(recovered.identity.name,'Kate');assert.equal(recovered.sessions.length,1);assert.deepEqual(recovered.events.map(x=>x.id),['e1','e2']);assert.equal(recovered.discardedPartialEvent,true)})

test('concurrent biography updates are serialized into a valid atomic file',async()=>{const dir=await fs.mkdtemp(path.join(os.tmpdir(),'bio-atomic-')),file=path.join(dir,'bio.json'),bio=new Biography(file,{name:'Kate',username:'Kate'});await Promise.all(Array.from({length:80},(_,i)=>bio.add('event',`Evento ${i}`,`Testo ${i}`)));const saved=JSON.parse(await fs.readFile(file,'utf8'));assert.equal(saved.events.length,80);assert.equal((await fs.readdir(dir)).filter(x=>x.endsWith('.tmp')).length,0);await fs.rm(dir,{recursive:true,force:true})})
