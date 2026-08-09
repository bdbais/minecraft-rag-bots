import test from 'node:test'
import assert from 'node:assert/strict'
import { OllamaClient } from '../src/ollama.js'

test('two consecutive decision timeouts switch to the emergency model',async()=>{let calls=0,change;const client=new OllamaClient('http://local','minecraft-agent','embed',null,{fallbackModel:'minecraft-agent-lite',onFallback:x=>{change=x}});client.request=async()=>{calls++;if(calls<=2)throw new Error('Timeout Ollama');return{message:{content:'{}'}}};await assert.rejects(client.decide('','',''));await client.decide('','','');assert.equal(client.chatModel,'minecraft-agent-lite');assert.equal(change.current,'minecraft-agent-lite')})
