import test from 'node:test'
import assert from 'node:assert/strict'
import { exploreStrategies, fuzzyScore } from '../src/strategy-search.js'

test('fuzzy strategy search prefers safe actions with prerequisites',()=>{
  const state={health:20,food:20,inventory:{oak_log:3}}
  const list=exploreStrategies(state,{collect_wood:2})
  assert.ok(list.length<=3)
  assert.ok(list.every(x=>x.score>=0&&x.score<=1))
  assert.ok(fuzzyScore({action:'craft'},state)>fuzzyScore({action:'craft'},{health:4,food:3,inventory:{}},{}))
})
