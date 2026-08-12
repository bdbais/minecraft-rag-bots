import test from 'node:test'
import assert from 'node:assert/strict'
import { autonomousProgressionDecision } from '../src/actions.js'

test('planner equips armor found in inventory before exploration', () => {
  const bot={inventory:{items:()=>[{name:'iron_chestplate',count:1}]},game:{gameMode:'survival'}}
  const decision=autonomousProgressionDecision(bot,{health:20,food:20,equipment:[],nearbyEntities:[],nearbyBlocks:[]})
  assert.equal(decision.action,'equip');assert.equal(decision.args.name,'iron_chestplate');assert.equal(decision.args.destination,'torso')
})
