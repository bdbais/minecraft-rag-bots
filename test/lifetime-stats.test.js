import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { Vec3 } from 'vec3'
import { LifetimeStats } from '../src/lifetime-stats.js'

test('lifetime statistics persist travel encounters materials and animal kills',async()=>{const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lifetime-')),file=path.join(dir,'stats.json'),tracker=new LifetimeStats(file,()=>['HelperBot']);let position=new Vec3(0,64,0),items=[];const bot={username:'Hero',entity:{get position(){return position}},game:{dimension:'overworld'},players:{Alice:{entity:{}},HelperBot:{entity:{}}},inventory:{items:()=>items}};await tracker.load();await tracker.sample(bot);position=new Vec3(3,64,4);items=[{name:'oak_log',count:4}];await tracker.sample(bot);tracker.noteAttack({id:7,name:'cow'});assert.equal(await tracker.noteDeath({id:7,name:'cow'}),true);await tracker.save();const result=tracker.snapshot();assert.equal(result.distanceMeters,5);assert.equal(result.playersEncountered,1);assert.equal(result.botsEncountered,1);assert.equal(result.materialsCollected,4);assert.equal(result.animalsKilled,1);await fs.rm(dir,{recursive:true,force:true})})
test('total play time accumulates and persists across sessions',async()=>{const dir=await fs.mkdtemp(path.join(os.tmpdir(),'playtime-')),file=path.join(dir,'stats.json'),bot={entity:{position:new Vec3(0,64,0)},game:{dimension:'overworld'},players:{},inventory:{items:()=>[]}},tracker=new LifetimeStats(file);await tracker.sample(bot);tracker.lastSampleAt-=2500;await tracker.sample(bot);await tracker.save();const loaded=new LifetimeStats(file);await loaded.load();assert.ok(loaded.snapshot().totalPlayMs>=2500);loaded.resetSession();assert.equal(loaded.snapshot().totalPlayMs,tracker.snapshot().totalPlayMs);await fs.rm(dir,{recursive:true,force:true})})
