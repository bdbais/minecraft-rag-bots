import test from 'node:test'
import assert from 'node:assert/strict'
import { compareVersions, checkForUpdates } from '../src/update-checker.js'

test('semantic version comparison handles prefixes', () => { assert.equal(compareVersions('v1.2.0','1.1.9'),1); assert.equal(compareVersions('0.9.1','0.9.1'),0) })
test('update checker handles an unpublished repository', async () => { const result = await checkForUpdates('0.9.1','x/y',async()=>({status:404,ok:false})); assert.equal(result.status,'unavailable') })
test('update checker detects a newer release', async () => { const result = await checkForUpdates('0.9.1','x/y',async()=>({status:200,ok:true,json:async()=>({tag_name:'v1.0.0',html_url:'https://example.test'})})); assert.equal(result.status,'available') })
