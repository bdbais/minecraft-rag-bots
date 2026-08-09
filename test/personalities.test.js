import test from 'node:test'
import assert from 'node:assert/strict'
import { personalities, personalityPrompt } from '../src/personalities.js'

test('every personality has a usable prompt and unknown values fall back', () => {
  assert.ok(Object.keys(personalities).length >= 7)
  for (const value of Object.values(personalities)) assert.ok(value.prompt.length > 20)
  assert.equal(personalityPrompt('unknown'), personalities.balanced.prompt)
})
