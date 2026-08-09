import test from 'node:test'
import assert from 'node:assert/strict'
import { BotManager, startupSummary } from '../src/bot-manager.js'

test('start requested during bootstrap is queued instead of failing',()=>{const manager=new BotManager('.');manager.entries.set('a',{config:{name:'A'},connection:'initializing',logs:[],pendingInstructions:[]});const result=manager.start('a');assert.equal(result.queued,true);assert.equal(manager.entries.get('a').startRequested,true)})
test('stop during bootstrap cancels a queued automatic start',()=>{const manager=new BotManager('.');manager.entries.set('a',{config:{name:'A'},connection:'initializing',logs:[],pendingInstructions:[],startRequested:true});manager.stop('a');assert.equal(manager.entries.get('a').startRequested,false)})
test('snapshot exposes the beginning of the online play session',()=>{const manager=new BotManager('.'),onlineSince='2026-08-03T10:00:00.000Z';manager.entries.set('a',{config:{name:'A'},connection:'online',onlineSince,logs:[],pendingInstructions:[]});assert.equal(manager.snapshot('a').onlineSince,onlineSince)})
test('startup summary averages the latest ten successful starts',()=>{const history=Array.from({length:12},(_,i)=>({durationMs:(i+1)*1000})),summary=startupSummary(history);assert.equal(summary.samples,10);assert.equal(summary.averageMs,7500);assert.equal(summary.lastMs,12000);assert.equal(summary.minMs,3000);assert.equal(summary.maxMs,12000)})
