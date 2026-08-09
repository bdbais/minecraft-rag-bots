import test from 'node:test'
import assert from 'node:assert/strict'
import { psychProfile } from '../src/traits.js'

test('psychophysical profile clamps GURPS-like attributes and preserves fears',()=>{const p=psychProfile({strength:30,dexterity:2,willpower:7,vitality:8,fear:'darkness',phobia:'caves',temperament:'protective'});assert.equal(p.stats.ST,16);assert.equal(p.stats.DX,6);assert.match(p.prompt,/darkness/);assert.match(p.prompt,/caves/);assert.match(p.prompt,/protect companions/)})
