import test from 'node:test'
import assert from 'node:assert/strict'
import { OllamaClient } from '../src/ollama.js'

test('Ollama client retries a transient bootstrap-not-ready response',async()=>{const original=global.fetch;let calls=0;global.fetch=async()=>++calls<3?{ok:false,status:503,text:async()=>'{"error":"model bootstrap not ready"}'}:{ok:true,json:async()=>({embeddings:[[1,2]]})};try{const client=new OllamaClient('http://local','chat','embed');client.retryDelayMs=1;assert.deepEqual(await client.embed('hello'),[[1,2]]);assert.equal(calls,3)}finally{global.fetch=original}})
