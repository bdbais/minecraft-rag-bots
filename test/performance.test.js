import test from 'node:test'
import assert from 'node:assert/strict'
import { calculatePerformance, BENCHMARK_VERSION } from '../src/performance.js'

test('MBPI score reports quality speed progress and confidence',()=>{const start=Date.parse('2026-01-01T00:00:00Z'),samples=Array.from({length:20},(_,i)=>({at:new Date(start+i*10000).toISOString(),success:i<16,totalMs:8000,planningMs:7000,actionMs:1000}));const result=calculatePerformance(samples,4);assert.equal(result.version,BENCHMARK_VERSION);assert.equal(result.provisional,false);assert.equal(result.confidence,100);assert.equal(result.successRate,80);assert.ok(result.score>0&&result.score<=1000);assert.ok(result.actionsPerMinute>0)})
test('MBPI marks short runs as provisional',()=>{const result=calculatePerformance([{at:new Date().toISOString(),success:true,totalMs:100}],0);assert.equal(result.provisional,true);assert.equal(result.confidence,5)})
