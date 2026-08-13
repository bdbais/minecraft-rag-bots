import test from 'node:test'
import assert from 'node:assert/strict'
import { Agent } from '../src/agent.js'

test('wanderer gradually adopts the profession supported by verified experience', () => {
  const learner = { skills: {
    harvest_crops: { successes: 3, failures: 0 },
    plant_crops: { successes: 2, failures: 1 },
    prepare_farm: { successes: 2, failures: 0 }
  } }
  const agent = new Agent({}, null, null, { profession: 'wanderer' }, {}, learner)
  assert.equal(agent.inferredProfession(), 'farmer')
})

test('explicit profession remains stable despite other learned skills', () => {
  const learner = { skills: { build_shelter: { successes: 20, failures: 0 } } }
  const agent = new Agent({}, null, null, { profession: 'hunter' }, {}, learner)
  assert.equal(agent.inferredProfession(), 'hunter')
})
