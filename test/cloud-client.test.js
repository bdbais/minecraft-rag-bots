import test from 'node:test'
import assert from 'node:assert/strict'
import { CloudAIClient } from '../src/cloud-client.js'

test('cloud client sends bearer auth and parses embeddings', async () => {
  const original = globalThis.fetch; let auth
  globalThis.fetch = async (_url, options) => { auth = options.headers.authorization; return { ok:true, json:async()=>({data:[{index:0,embedding:[1,2]}]}) } }
  try { const client = new CloudAIClient('https://example.test/v1','chat','embed','secret'); assert.deepEqual(await client.embed('hello'),[[1,2]]); assert.equal(auth,'Bearer secret') }
  finally { globalThis.fetch = original }
})
