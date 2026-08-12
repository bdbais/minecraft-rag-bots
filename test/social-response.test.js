import test from 'node:test'
import assert from 'node:assert/strict'
import { socialResponse } from '../src/bot-manager.js'

test('social response reflects personality instead of only saying hello', () => {
  const response = socialResponse({ name: 'Grifa', personality: 'explorer' }, 'Alex', 'ciao')
  assert.match(response, /Grifa/)
  assert.match(response, /esplorare/i)
})

test('social response answers gratitude, help and goals contextually', () => {
  assert.match(socialResponse({ name: 'Grifa' }, 'Alex', 'grazie'), /collaborare/i)
  assert.match(socialResponse({ name: 'Grifa' }, 'Alex', 'aiuto'), /percorso più sicuro/i)
  assert.match(socialResponse({ name: 'Grifa' }, 'Alex', 'qual è il tuo obiettivo?'), /sopravvivere/i)
})
