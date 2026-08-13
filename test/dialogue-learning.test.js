import test from 'node:test'
import assert from 'node:assert/strict'
import { DialogueLearning } from '../src/dialogue-learning.js'

test('dialogue learning improves profile from useful cooperative turns',()=>{const d=new DialogueLearning('unused','social');const r=d.observe({incoming:'Puoi aiutarmi a trovare il ferro?',reply:'Sì, cerchiamo insieme.',addressed:true,karma:1,goal:true});assert.equal(r.useful,true);assert.equal(d.stats.collaborative,1);assert.equal(d.topics.aiut,1);assert.match(d.prompt(),/collaboration=1/);assert.match(d.prompt(),/recurring topics=.*aiut/)})
