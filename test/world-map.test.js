import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { WorldMapMemory, classifyPoi } from '../src/world-map.js'

test('world map records a wide explored area and the bot trail',async()=>{const dir=await fs.mkdtemp(path.join(os.tmpdir(),'world-map-')),map=new WorldMapMemory(path.join(dir,'map.json')),position={x:8.2,y:64,z:-3.1};await map.sample({entity:{position},blockAt:p=>({name:'grass_block',boundingBox:'block',position:p})},48);const data=map.data(position,[]);assert.equal(data.cells.length,441);assert.equal(data.trail.length,1);assert.equal(data.position.x,8);await fs.rm(dir,{recursive:true,force:true})})
test('map classifies discovered points of interest',()=>{assert.equal(classifyPoi('diamond_ore'),'resource');assert.equal(classifyPoi('nether_portal'),'portal');assert.equal(classifyPoi('spawner'),'danger');assert.equal(classifyPoi('crafting_table'),'workstation');assert.equal(classifyPoi('chest'),'storage')})
test('world knowledge merges sightings and survives restart',async()=>{const dir=await fs.mkdtemp(path.join(os.tmpdir(),'world-knowledge-')),file=path.join(dir,'map.json'),map=new WorldMapMemory(file);map.rememberTargets([{name:'oak_log',x:10,y:64,z:20},{name:'oak_log',x:11,y:65,z:21}],'overworld');await map.save();const loaded=new WorldMapMemory(file);await loaded.load();const knowledge=loaded.knowledge({x:0,z:0},'overworld');assert.equal(knowledge.rememberedLocations.length,1);assert.equal(knowledge.rememberedLocations[0].name,'oak_log');assert.equal(knowledge.rememberedLocations[0].sightings,2);assert.equal(knowledge.rememberedLocations[0].distance,24);await fs.rm(dir,{recursive:true,force:true})})
