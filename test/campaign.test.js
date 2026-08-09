import test from 'node:test'
import assert from 'node:assert/strict'
import { campaignState } from '../src/campaign.js'
test('campaign advances through verified resources', () => { const state = campaignState({ inventory: { oak_log: 6, bread: 8, iron_ingot: 4 } }, []); assert.equal(state.phase, 'nether_prep'); assert.match(state.objective, /portale/i) })
test('campaign recognizes stronghold and end assault', () => { const state = campaignState({ inventory: { blaze_rod: 6, ender_pearl: 6, ender_eye: 5, iron_sword: 1 } }, [{ type: 'other', label: 'stronghold' }]); assert.equal(state.phase, 'end_assault'); assert.equal(state.completion, 95) })
