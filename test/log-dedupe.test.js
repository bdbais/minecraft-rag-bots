import test from 'node:test'
import assert from 'node:assert/strict'
import { BotManager } from '../src/bot-manager.js'

test('repeated runtime errors are summarized instead of flooding activity log', async () => {
  const manager = new BotManager('.')
  manager.entries.set('bot', { config: { name: 'Bot' }, logs: [], logDedupe: new Map() })
  manager.log('bot', 'error', 'same failure')
  manager.log('bot', 'error', 'same failure')
  manager.log('bot', 'error', 'same failure')
  assert.equal(manager.entries.get('bot').logs.length, 1)
  assert.equal(manager.entries.get('bot').logDedupe.get('error:same failure').count, 3)
})
