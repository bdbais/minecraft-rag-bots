import test from 'node:test'
import assert from 'node:assert/strict'
import { Agent } from '../src/agent.js'

test('progress watchdog interrupts an action that remains physically still',async()=>{const bot={entity:{position:{x:0,y:64,z:0}},inventory:{items:()=>[]},health:20,food:20},agent=new Agent(bot,null,null,{});await assert.rejects(agent.withProgressWatchdog(new Promise(()=>{}),1000,'Movimento',30),/nessun progresso/)})

test('progress watchdog permits an action that changes position',async()=>{const bot={entity:{position:{x:0,y:64,z:0}},inventory:{items:()=>[]},health:20,food:20},agent=new Agent(bot,null,null,{}),operation=new Promise(resolve=>setTimeout(()=>{bot.entity.position.x=2;setTimeout(()=>resolve('ok'),15)},15));assert.equal(await agent.withProgressWatchdog(operation,500,'Movimento',40),'ok')})
