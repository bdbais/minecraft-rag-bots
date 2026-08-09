import test from 'node:test'
import assert from 'node:assert/strict'
import { Agent } from '../src/agent.js'

test('manual instructions are queued in order', () => {
  const agent = new Agent({ pathfinder: { setGoal() {} } }, {}, {}, {})
  agent.instruct('eat first'); agent.instruct('go home')
  assert.deepEqual(agent.instructions, ['eat first', 'go home'])
  assert.equal(agent.generation, 2)
})

test('timeout rejects a stuck action', async () => {
  const agent = new Agent({ pathfinder: { setGoal() {} } }, {}, {}, {})
  await assert.rejects(agent.withTimeout(new Promise(() => {}), 5, 'Azione'), /bloccata/)
})
