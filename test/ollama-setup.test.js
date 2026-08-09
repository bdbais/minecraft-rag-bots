import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeOllamaTags, queryOllama } from '../src/ollama-setup.js'

test('Ollama setup recognizes both required local models',()=>{const status=analyzeOllamaTags({models:[{name:'minecraft-agent:latest'},{model:'nomic-embed-text:latest'}]});assert.equal(status.ready,true);assert.equal(status.hasMinecraftAgent,true);assert.equal(status.hasEmbeddingModel,true)})
test('Ollama setup reports an unreachable local service',async()=>{const status=await queryOllama('http://localhost:11434',async()=>{throw new Error('offline')});assert.equal(status.running,false);assert.equal(status.ready,false)})
