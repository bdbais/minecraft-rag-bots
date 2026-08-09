import test from 'node:test'
import assert from 'node:assert/strict'
import { weatherSnapshot } from '../src/weather.js'

const bot=(temperature,weather={})=>({entity:{position:{offset:()=>({})}},blockAt:()=>({biome:{name:temperature<=.15?'snowy_plains':'plains',temperature}}),game:{dimension:'overworld'},time:{timeOfDay:6000},rainState:0,thunderState:0,isRaining:false,...weather})
test('weather identifies sun rain snow and thunderstorms',()=>{assert.equal(weatherSnapshot(bot(.8)).kind,'clear');assert.equal(weatherSnapshot(bot(.8,{isRaining:true,rainState:1})).kind,'rain');assert.equal(weatherSnapshot(bot(0,{isRaining:true,rainState:1})).kind,'snow');assert.equal(weatherSnapshot(bot(.8,{isRaining:true,rainState:1,thunderState:1})).kind,'thunder')})
