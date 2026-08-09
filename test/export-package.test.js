import test from 'node:test'
import assert from 'node:assert/strict'
import { createExportPackage } from '../src/export-package.js'

test('single bot export includes its history but no API key', () => {
  const bundle = createExportPackage({ configs:[{id:'a',name:'A',aiProvider:'cloud',cloudApiKey:'secret',hasCloudApiKey:true},{id:'b',name:'B'}], dataFiles:{'memory-a.json':[1],'skills-a.json':{x:1},'memory-b.json':[2]}, selectedId:'a', appVersion:'1.0.0' })
  assert.equal(bundle.configs.length,1); assert.equal(bundle.configs[0].cloudApiKey,undefined); assert.equal(bundle.security.apiKeysIncluded,false); assert.deepEqual(Object.keys(bundle.data).sort(),['memory-a.json','skills-a.json'])
})

test('complete export includes every configured bot', () => { const bundle=createExportPackage({configs:[{id:'a'},{id:'b'}],dataFiles:{},appVersion:'1'}); assert.equal(bundle.type,'complete-configuration'); assert.equal(bundle.configs.length,2) })

test('single bot export includes discovered chest memory',()=>{const bundle=createExportPackage({configs:[{id:'a'}],dataFiles:{'chests-a.json':{'1,2,3':{x:1,y:2,z:3}}},selectedId:'a',appVersion:'1'});assert.ok(bundle.data['chests-a.json'])})

test('single bot export includes lifetime and only its server checkpoints',()=>{const serverName=`team-checkpoints-${Buffer.from('localhost:25565').toString('base64url')}.json`,otherName=`team-checkpoints-${Buffer.from('elsewhere:25565').toString('base64url')}.json`,bundle=createExportPackage({configs:[{id:'a',host:'localhost',port:25565}],dataFiles:{'lifetime-a.json':{distanceMeters:12},[serverName]:{items:{}},[otherName]:{items:{secret:{}}}},selectedId:'a',appVersion:'1'});assert.equal(bundle.data['lifetime-a.json'].distanceMeters,12);assert.ok(bundle.data[serverName]);assert.equal(bundle.data[otherName],undefined)})
