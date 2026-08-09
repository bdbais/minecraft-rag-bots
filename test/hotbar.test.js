import test from 'node:test'
import assert from 'node:assert/strict'
import { Vec3 } from 'vec3'
import { observe } from '../src/observe.js'

test('observation preserves hotbar order and selected held item',()=>{const p=new Vec3(0,64,0),slots=Array(46).fill(null);slots[36]={name:'wooden_axe',displayName:'Wooden Axe',count:1};slots[38]={name:'oak_log',displayName:'Oak Log',count:7};const bot={entity:{position:p},health:20,food:20,oxygenLevel:20,quickBarSlot:2,heldItem:slots[38],game:{dimension:'overworld'},time:{timeOfDay:0},inventory:{items:()=>[slots[36],slots[38]],slots,hotbarStart:36},entities:{},findBlocks:()=>[],blockAt:()=>null};const state=observe(bot);assert.equal(state.hotbar.length,9);assert.equal(state.hotbar[0].name,'wooden_axe');assert.equal(state.hotbar[1],null);assert.equal(state.hotbar[2].name,'oak_log');assert.equal(state.selectedHotbarSlot,2);assert.equal(state.heldItem.name,'oak_log')})
