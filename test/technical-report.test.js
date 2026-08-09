import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { BotManager } from '../src/bot-manager.js'

test('technical report contains evaluation context and excludes credentials',async()=>{const dir=await fs.mkdtemp(path.join(os.tmpdir(),'technical-report-')),manager=new BotManager(dir),id='kate';manager.entries.set(id,{config:{id,name:'Kate',username:'Kate',host:'localhost',port:54321,aiProvider:'cloud',cloudModel:'model-x',cloudEmbedModel:'embed-x',cloudApiKey:'SECRET',personality:'balanced'},connection:'online',logs:[],pendingInstructions:[]});manager.log(id,'error','craft failed');const report=await manager.technicalReport(id),text=JSON.stringify(report);assert.equal(report.bot.model,'model-x');assert.equal(report.logs.at(-1).message,'craft failed');assert.equal(text.includes('SECRET'),false);await fs.rm(dir,{recursive:true,force:true})})
