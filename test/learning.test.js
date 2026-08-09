import test from 'node:test'
import assert from 'node:assert/strict'
import { stateDelta } from '../src/learning.js'
import { LearningEngine } from '../src/learning.js'

test('learning detects inventory and movement changes', () => {
  const delta = stateDelta({ inventory: { oak_log: 1 }, position: { x: 0, y: 64, z: 0 }, health: 20, food: 18, dimension: 'overworld' }, { inventory: { oak_log: 4 }, position: { x: 3, y: 64, z: 4 }, health: 18, food: 17, dimension: 'overworld' })
  assert.deepEqual(delta.inventory, ['oak_log +3'])
  assert.equal(delta.distance, 5)
  assert.equal(delta.health, -2)
})

test('verified chat success cannot be overturned by the critic', async () => {
  const ollama = { decide: async () => ({ achieved: false, lesson: 'no movement', nextStrategy: 'move', reusable: false, confidence: 0.2 }) }
  const memory = { add: async () => {} }
  const learner = new LearningEngine('unused', ollama, memory)
  learner.save = async () => {}
  const state = { inventory: {}, position: { x: 0, y: 64, z: 0 }, health: 20, food: 20, dimension: 'overworld' }
  const learned = await learner.learn({ before: state, after: state, decision: { action: 'chat', goal: 'report', expected: 'message sent', args: { message: 'hello' } }, manual: 'report', executionSuccess: true, result: 'sent chat', step: 1 })
  assert.equal(learned.achieved, true)
  assert.equal(learner.skills.chat.successes, 1)
})
