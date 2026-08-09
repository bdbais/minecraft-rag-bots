import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { minecraftConnectionOptions } from '../src/minecraft-auth.js'

test('Microsoft authentication keeps an isolated profile for every bot', () => {
  let received
  const options = minecraftConnectionOptions({ id:'bot/one', name:'Ada', username:'ada@example.test', host:'play.example.test', port:25565, auth:'microsoft' }, 'data', code => { received = code })
  assert.equal(options.auth, 'microsoft')
  assert.equal(options.profilesFolder, path.join('data', 'microsoft-auth', 'bot_one'))
  assert.equal(options.password, undefined)
  options.onMsaCode({ user_code:'ABCD-EFGH', verification_uri:'https://www.microsoft.com/link' })
  assert.equal(received.userCode, 'ABCD-EFGH')
  assert.equal(received.account, 'ada@example.test')
})

test('offline authentication does not create a Microsoft token profile', () => {
  const options = minecraftConnectionOptions({ id:'local', username:'Steve', host:'localhost', auth:'offline' }, 'data')
  assert.equal(options.auth, 'offline')
  assert.equal(options.profilesFolder, undefined)
})
