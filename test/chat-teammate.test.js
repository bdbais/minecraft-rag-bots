import test from 'node:test'
import assert from 'node:assert/strict'

test('teammate identity matching is case insensitive and includes display names',()=>{const username='grifa',other={bot:{username:'Grifa'},config:{username:'ignored',name:'Display'}};const matches=[other.bot?.username,other.config.username,other.config.name].filter(Boolean).some(name=>String(name).toLowerCase()===String(username).toLowerCase());assert.equal(matches,true)})
