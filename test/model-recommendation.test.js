import test from 'node:test'
import assert from 'node:assert/strict'
import { recommendLocalModel } from '../src/model-recommendation.js'

test('Intel integrated laptop receives a lightweight model',()=>{const r=recommendLocalModel({ramBytes:32*1024**3,cpuModel:'Intel Core Ultra 7 155U',gpus:[{vendorId:0x8086}]});assert.equal(r.baseModel,'qwen3:1.7b');assert.equal(r.fallbackModel,'qwen3:0.6b')})
test('very low memory receives the smallest model',()=>{assert.equal(recommendLocalModel({ramBytes:8*1024**3}).baseModel,'qwen3:0.6b')})
