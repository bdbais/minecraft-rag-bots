import test from 'node:test'
import assert from 'node:assert/strict'
import { canAutoRespawn } from '../src/bot-manager.js'

test('non-hardcore game modes allow controlled automatic respawn', () => {
  assert.equal(canAutoRespawn({ gameMode: 'survival', hardcore: false }), true)
  assert.equal(canAutoRespawn({ gameMode: 'creative' }), true)
})

test('hardcore worlds never attempt automatic respawn', () => {
  assert.equal(canAutoRespawn({ gameMode: 'hardcore' }), false)
  assert.equal(canAutoRespawn({ gameMode: 'survival', hardcore: true }), false)
})
