import path from 'node:path'
import mineflayer from 'mineflayer'
import pathfinderPackage from 'mineflayer-pathfinder'
import collectBlock from 'mineflayer-collectblock'
import { config } from './config.js'
import { OllamaClient } from './ollama.js'
import { MemoryStore } from './memory.js'
import { knowledge } from './knowledge.js'
import { Agent } from './agent.js'

const bot = mineflayer.createBot(config.mc)
const { pathfinder } = pathfinderPackage
bot.loadPlugin(pathfinder)
bot.loadPlugin(collectBlock.plugin)
const ollama = new OllamaClient(config.ollamaUrl, config.model, config.embedModel)
const memory = new MemoryStore(path.resolve('data/memory.json'), ollama)
let agent

bot.once('spawn', async () => {
  console.log(`Joined ${config.mc.host}:${config.mc.port} as ${bot.username}`)
  await memory.load()
  for (const text of knowledge) if (!memory.items.some(x => x.text === text)) await memory.add(text, { type: 'knowledge' })
  agent = new Agent(bot, ollama, memory, config)
  if (config.autoStart) agent.start()
})

bot.on('chat', (username, message) => {
  if (username === bot.username || !agent) return
  if (message === '!start') agent.start()
  if (message === '!stop') { agent.stop(); bot.chat('Paused.') }
  if (message === '!status') bot.chat(`steps=${agent.steps} memories=${memory.items.length} running=${agent.running}`)
})
bot.on('death', () => memory.add(`FAILURE: died at step ${agent?.steps || 0}. Future plans should prioritize food, armor, shelter, and avoiding the last danger.`, { type: 'experience', success: false }).catch(console.error))
bot.on('kicked', reason => console.error('Kicked:', reason))
bot.on('error', error => console.error('Minecraft error:', error.message))
process.on('SIGINT', () => { agent?.stop(); bot.quit('Stopping'); process.exit(0) })
