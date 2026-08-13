import test from 'node:test'
import assert from 'node:assert/strict'
import { autonomousProgressionDecision } from '../src/actions.js'

test('bot prioritizes reaching a nearby teammate in critical condition', () => {
  const bot={inventory:{items:()=>[{name:'bread',count:8}]},game:{dimension:'overworld'}}
  const decision=autonomousProgressionDecision(bot,{health:20,food:20,nearbyEntities:[{type:'player',username:'Grifa',health:4,distance:8}],nearbyBlocks:[]},[])
  assert.equal(decision.action,'follow_player')
  assert.equal(decision.args.username,'Grifa')
})
