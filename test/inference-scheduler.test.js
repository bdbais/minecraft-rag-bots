import test from 'node:test'
import assert from 'node:assert/strict'
import { InferenceScheduler } from '../src/inference-scheduler.js'

test('scheduler serializes inference jobs', async () => {
  const scheduler = new InferenceScheduler(1); let active = 0, peak = 0
  const task = () => scheduler.schedule(async () => { active++; peak = Math.max(peak,active); await new Promise(r=>setTimeout(r,5)); active--; return true })
  await Promise.all([task(),task(),task()]); assert.equal(peak,1)
})

test('emergency stop rejects queued and active jobs', async () => {
  const scheduler = new InferenceScheduler(1)
  const jobs = [scheduler.schedule(signal => new Promise((resolve,reject) => { if (signal.aborted) reject(new Error('stopped')); else signal.addEventListener('abort',()=>reject(new Error('stopped'))) })), scheduler.schedule(async()=>true)]
  scheduler.abortAll(); const results = await Promise.allSettled(jobs); assert.ok(results.every(x=>x.status==='rejected'))
})
