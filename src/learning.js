import fs from 'node:fs/promises'
import path from 'node:path'

const reflectionSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    achieved: { type: 'boolean' }, lesson: { type: 'string' }, nextStrategy: { type: 'string' },
    reusable: { type: 'boolean' }, confidence: { type: 'number', minimum: 0, maximum: 1 }
  }, required: ['achieved', 'lesson', 'nextStrategy', 'reusable', 'confidence']
}

export function stateDelta(before, after) {
  const changes = []
  const keys = new Set([...Object.keys(before.inventory || {}), ...Object.keys(after.inventory || {})])
  for (const key of keys) {
    const delta = (after.inventory?.[key] || 0) - (before.inventory?.[key] || 0)
    if (delta) changes.push(`${key} ${delta > 0 ? '+' : ''}${delta}`)
  }
  const distance = before.position && after.position ? Math.round(Math.hypot(after.position.x-before.position.x, after.position.y-before.position.y, after.position.z-before.position.z)) : 0
  return { inventory: changes, health: (after.health ?? 0) - (before.health ?? 0), food: (after.food ?? 0) - (before.food ?? 0), distance, dimensionChanged: before.dimension !== after.dimension }
}

export class LearningEngine {
  constructor(file, ollama, memory, shared = null) { this.file = file; this.ollama = ollama; this.memory = memory; this.shared = shared; this.skills = {}; this.totalLessons = 0 }
  async load() { try { const data = JSON.parse(await fs.readFile(this.file, 'utf8')); this.skills = data.skills || {}; this.totalLessons = data.totalLessons || 0 } catch (e) { if (e.code !== 'ENOENT') throw e } }
  async save() { await fs.mkdir(path.dirname(this.file), { recursive: true }); await fs.writeFile(this.file, JSON.stringify({ totalLessons: this.totalLessons, skills: this.skills }, null, 2)) }
  summary() {
    return Object.entries(this.skills).map(([action, x]) => ({ action, attempts: x.successes+x.failures, successRate: x.successes/(x.successes+x.failures || 1), bestLesson: x.bestLesson })).sort((a,b)=>b.attempts-a.attempts)
  }
  async learn({ before, after, decision, manual, executionSuccess, result, step }) {
    const delta = stateDelta(before, after)
    const key = decision.action
    const stat = this.skills[key] ||= { successes: 0, failures: 0, bestLesson: '', lastResult: '' }
    const visiblyUseful = delta.inventory.some(x => /\+[1-9]/.test(x)) || delta.distance > 0 || delta.dimensionChanged || delta.health > 0 || delta.food > 0
    let reflection = {
      achieved: executionSuccess && (visiblyUseful || ['wait','chat','equip','craft','eat','attack_nearest','share_checkpoint','unstuck'].includes(key)),
      lesson: executionSuccess ? `${key} was executable in this state.` : `${key} failed: ${result}`,
      nextStrategy: executionSuccess ? 'Build on the new state.' : 'Change prerequisites, target, or approach before retrying.', reusable: true, confidence: 0.65
    }
    if (!executionSuccess || manual || step % 5 === 0) {
      try {
        reflection = await this.ollama.decide('You are a Minecraft learning critic. Judge outcomes from observed state changes. Extract a short factual lesson. Never claim success without evidence. Return JSON only.',
          `Instruction: ${manual || 'autonomous progression'}\nGoal: ${decision.goal}\nExpected: ${decision.expected}\nAction: ${key} ${JSON.stringify(decision.args)}\nExecution: ${executionSuccess ? 'completed' : 'failed'} (${result})\nObserved delta: ${JSON.stringify(delta)}`, reflectionSchema)
      } catch {}
    }
    const directlyVerified = executionSuccess && ['chat', 'wait', 'equip', 'share_checkpoint', 'unstuck'].includes(key)
    if (directlyVerified) {
      reflection.achieved = true
      reflection.reusable = true
      reflection.confidence = Math.max(Number(reflection.confidence) || 0, 0.95)
      reflection.lesson = `${key} completed successfully: ${result}`
    }
    if (reflection.achieved) stat.successes++; else stat.failures++
    stat.lastResult = String(result); if (reflection.reusable && reflection.achieved) stat.bestLesson = reflection.lesson
    const text = `LEARNED EPISODE. Human instruction: ${manual || 'none'}. Goal: ${decision.goal}. Action: ${key} ${JSON.stringify(decision.args)}. Observed change: ${JSON.stringify(delta)}. Outcome: ${reflection.achieved ? 'SUCCESS' : 'FAILURE'}. Lesson: ${reflection.lesson}. Next strategy: ${reflection.nextStrategy}. Confidence: ${reflection.confidence}.`
    this.totalLessons++; if(reflection.reusable && Number(reflection.confidence)>=0.7) { await this.memory.add(text, { type: 'learned_episode', success: reflection.achieved, action: key, confidence: reflection.confidence, manualInstruction: manual || null }); await this.shared?.record({text,action:key,confidence:reflection.confidence,success:reflection.achieved,source:step}) } await this.save()
    return { ...reflection, delta }
  }
}
