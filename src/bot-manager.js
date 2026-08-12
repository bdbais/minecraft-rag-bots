import { EventEmitter } from 'node:events'
import path from 'node:path'
import fs from 'node:fs/promises'
import mineflayer from 'mineflayer'
import pathfinderPackage from 'mineflayer-pathfinder'
import collectBlock from 'mineflayer-collectblock'
import { OllamaClient } from './ollama.js'
import { MemoryStore } from './memory.js'
import { knowledge } from './knowledge.js'
import { observe } from './observe.js'
import { Agent } from './agent.js'
import { LearningEngine } from './learning.js'
import { Biography } from './biography.js'
import { EpicBookGenerator, prepareChronicle } from './epic-book.js'
import { InferenceScheduler } from './inference-scheduler.js'
import { CloudAIClient } from './cloud-client.js'
import { ChestMemory } from './chest-memory.js'
import { PerformanceTracker } from './performance.js'
import { WorldMapMemory } from './world-map.js'
import { weatherSnapshot } from './weather.js'
import { minecraftConnectionOptions } from './minecraft-auth.js'
import { LifetimeStats } from './lifetime-stats.js'
import { TeamCheckpoints, serverCheckpointFile } from './team-checkpoints.js'
import { SocialMemory } from './social-memory.js'
import { LineageStore } from './lineage.js'

const { pathfinder, Movements } = pathfinderPackage
export function startupSummary(history=[],requestedAt=null,ready=false){const measuredAt=Date.now(),recent=history.filter(x=>Number.isFinite(x.durationMs)&&x.durationMs>=0).slice(-10),durations=recent.map(x=>x.durationMs),averageMs=durations.length?Math.round(durations.reduce((a,b)=>a+b,0)/durations.length):null;return{samples:durations.length,averageMs,lastMs:durations.at(-1)??null,minMs:durations.length?Math.min(...durations):null,maxMs:durations.length?Math.max(...durations):null,currentWaitMs:requestedAt&&!ready?Math.max(0,measuredAt-requestedAt):null,measuredAt,recent}}
export class BotManager extends EventEmitter {
  constructor(dataDir) { super(); this.dataDir = dataDir; this.entries = new Map(); this.scheduler = new InferenceScheduler(1); this.publishTimers = new Map();this.teamStores=new Map() }
  async checkpointStore(config){const server=`${String(config.host).toLowerCase()}:${Number(config.port)||25565}`;if(!this.teamStores.has(server)){const store=new TeamCheckpoints(serverCheckpointFile(this.dataDir,config.host,config.port),server);this.teamStores.set(server,store);await store.load()}return this.teamStores.get(server)}
  async syncDiscoveries(entry){const store=entry.teamStore,bot=entry.bot;if(!store||!bot?.entity)return;entry.sharedDiscoveries ||= new Set();for(const poi of Object.values(entry.worldMap?.pois||{})){const key=`poi:${poi.x},${poi.y},${poi.z}`;if(entry.sharedDiscoveries.has(key))continue;entry.sharedDiscoveries.add(key);const type=poi.name==='spawner'?'dungeon':poi.category;await store.publish({type,label:poi.name,x:poi.x,y:poi.y,z:poi.z,dimension:bot.game?.dimension,reporter:entry.config.name,note:`Scoperto automaticamente da ${entry.config.name}`,source:'map'})}const special=/^(blaze|enderman|witch|warden|wither_skeleton|elder_guardian|evoker|pillager|ravager|shulker|slime|magma_cube)$/;for(const entity of Object.values(bot.entities||{})){if(!special.test(entity.name||'')||!entity.position)continue;const key=`mob:${entity.id}`;if(entry.sharedDiscoveries.has(key))continue;entry.sharedDiscoveries.add(key);await store.publish({type:'monster',label:entity.name,x:entity.position.x,y:entity.position.y,z:entity.position.z,dimension:bot.game?.dimension,reporter:entry.config.name,note:'Mostro particolare avvistato',source:'entity'})}}
  snapshot(id) {
    const e = this.entries.get(id)
    if (!e) return null
    let game = null
    try { if (e.bot?.entity) game = observe(e.bot,{visionRadius:e.config.visionRadius}) } catch {}
    const phase=e.agent?.phase || (e.startRequested?'bootstrap':'idle'),busy=!!e.agent?.busy, progress=phase==='bootstrap'?35:phase==='planning'?60:busy?80:e.agent?.running?100:0
    return { id, name: e.config.name, gender: e.config.gender || 'neutral', runtimeModel:e.runtimeModel||null, minecraftVersion: e.bot?.version || e.config.version || '1.21.4', connection: e.connection, onlineSince:e.onlineSince||null, startup:startupSummary(e.startupHistory,e.connectRequestedAt,e.connection==='online'), ready:!!e.agent, startRequested:!!e.startRequested, running: !!e.agent?.running, busy, phase, activityProgress:progress, activityLabel:phase==='bootstrap'?'Preparazione AI':phase==='planning'?'Pianificazione':busy?'Esecuzione azione':e.agent?.running?'In attesa del prossimo ciclo':'In pausa', queuedPrompts: (e.agent?.instructions.length || 0)+(e.pendingInstructions?.length||0), inference: this.scheduler.stats(), performance:e.performance?.summary(Object.keys(e.biography?.milestones||{}).length), lifetime:e.lifetime?.snapshot()||null, worldKnowledge:e.worldMap?.knowledge(e.bot?.entity?.position,e.bot?.game?.dimension,30)||null, teamCheckpoints:e.teamStore?.list(30)||[], steps: e.agent?.steps || 0, successes: e.agent?.successes || 0, failures: e.agent?.failures || 0, memories: e.memory?.items.length || 0, learnedLessons: e.learner?.totalLessons || 0, skills: e.learner?.summary().slice(0, 8) || [], chests:e.chestMemory?.list() || [], biographyCount: e.biography?.events.length || 0, biography: e.biography?.recent(30) || [], teammates: this.teamContext(id), game, lastGoal: e.lastGoal || '', logs: e.logs.slice(-100) }
  }
  snapshots() { return [...this.entries.keys()].map(id => this.snapshot(id)) }
  async createChild(parentAId,parentBId,options={}) { const a=this.entries.get(parentAId),b=this.entries.get(parentBId);if(!a||!b)throw new Error('Servono due bot collegati per generare un discendente');const lineage=a.lineage||new LineageStore(path.join(this.dataDir,`lineage-${parentAId}.json`));const child=lineage.conceive({id:parentAId,name:a.config.name,...a.config},{id:parentBId,name:b.config.name,...b.config},options);await lineage.save();return {...child,...child.stats,host:a.config.host,port:a.config.port,version:a.config.version,username:child.name,auth:'offline',aiProvider:a.config.aiProvider||'local',model:a.config.model||'minecraft-agent',embedModel:a.config.embedModel||'nomic-embed-text',autoStart:false}}
  teamContext(forId) {
    const origin=this.entries.get(forId)?.bot?.entity?.position
    return [...this.entries.entries()].filter(([id,e])=>id!==forId&&e.connection==='online'&&origin&&e.bot?.entity?.position&&origin.distanceTo(e.bot.entity.position)<=32).map(([id, e]) => {
      const p = e.bot.entity.position;let observation={inventory:{},nearbyBlocks:[]};try{observation=observe(e.bot,{visionRadius:24})}catch{}
      return { id, name:e.config.name, username:e.bot?.username||e.config.username, gender:e.config.gender||'neutral', personality:e.config.personality||'balanced', distance:Math.round(origin.distanceTo(p)), position:{x:Math.floor(p.x),y:Math.floor(p.y),z:Math.floor(p.z)}, health:e.bot?.health, food:e.bot?.food, goal:e.lastGoal||'', running:!!e.agent?.running, sharedInformation:{inventory:observation.inventory,nearbyBlocks:observation.nearbyBlocks,chests:e.chestMemory?.list().slice(0,8)||[]} }
    })
  }
  publish(id, immediate = false) {
    const emit = () => { this.publishTimers.delete(id); const snapshot = this.snapshot(id); if (snapshot) this.emit('update', snapshot) }
    if (immediate) { clearTimeout(this.publishTimers.get(id)); emit(); return }
    if (!this.publishTimers.has(id)) this.publishTimers.set(id, setTimeout(emit, 250))
  }
  log(id, level, message) { const e = this.entries.get(id); if (!e) return;const record={at:new Date().toISOString(),level,message};e.logs.push(record);if(e.logs.length>300)e.logs.shift();fs.appendFile(path.join(this.dataDir,`technical-log-${id}.jsonl`),`${JSON.stringify(record)}\n`).catch(()=>{});this.publish(id) }
  async connect(config) {
    const id = config.id || crypto.randomUUID()
    if (this.entries.has(id)) throw new Error('Questo bot è già connesso')
    let startupHistory=[];try{const saved=JSON.parse(await fs.readFile(path.join(this.dataDir,`startup-${id}.json`),'utf8'));startupHistory=Array.isArray(saved)?saved:[]}catch{}
    const entry = { config: { ...config, id }, connection: 'connecting', logs: [], pendingInstructions: [], startRequested:config.autoStart !== false, connectRequestedAt:Date.now(), startupHistory }
    entry.teamStore=await this.checkpointStore({...config,id})
    this.entries.set(id, entry); this.publish(id)
    const aiClient = config.aiProvider === 'cloud'
      ? new CloudAIClient(config.cloudBaseUrl, config.cloudModel, config.cloudEmbedModel, config.cloudApiKey, this.scheduler)
      : new OllamaClient(config.ollamaUrl, config.model, config.embedModel, this.scheduler,{fallbackModel:config.model==='minecraft-agent'?'minecraft-agent-lite':'',onFallback:({previous,current})=>{entry.runtimeModel=current;this.log(id,'error',`Timeout AI ripetuti: passaggio automatico da ${previous} a ${current}`);this.publish(id)}})
    entry.ollama=aiClient;entry.runtimeModel=config.aiProvider==='cloud'?config.cloudModel:config.model
    entry.connection='preparing-ai';this.publish(id)
    try { await aiClient.decide('Warm-up only. Return JSON.', 'Return the JSON object {"ready":true}.', {type:'object',properties:{ready:{type:'boolean'}},required:['ready'],additionalProperties:false});entry.aiReady=true } catch (error) { entry.connection='error';entry.bootstrapError=`AI non pronta: ${error.message}`;this.log(id,'error',entry.bootstrapError);this.publish(id);throw error }
    const bot = mineflayer.createBot({...minecraftConnectionOptions(config, this.dataDir, code => this.emit('microsoft-code', code)),viewDistance:'far'})
    entry.bot = bot; bot.loadPlugin(pathfinder); bot.loadPlugin(collectBlock.plugin)
    bot.once('spawn', async () => {
      try {
        // Finestra di bootstrap: il client è già nel mondo ma memoria e AI non
        // sono ancora pronte. Blocchiamo ogni movimento residuo e vietiamo al
        // pathfinder di scavare/attraversare acqua o lava finché l'agente non parte.
        bot.clearControlStates?.(); bot.pathfinder?.setGoal(null)
        const safeMovements=new Movements(bot); safeMovements.canDig=false
        safeMovements.blocksToAvoid=new Set([bot.registry?.blocksByName?.water?.id,bot.registry?.blocksByName?.lava?.id].filter(Number.isInteger))
        bot.pathfinder?.setMovements(safeMovements)
        entry.bootstrapSafe=true
        entry.connection = 'initializing'; this.publish(id)
        const ollama = entry.ollama
        entry.ollama = ollama
        entry.runtimeModel=config.aiProvider==='cloud'?config.cloudModel:config.model
        const legacyLocal = config.aiProvider !== 'cloud' && (config.embedModel || 'nomic-embed-text') === 'nomic-embed-text'
        const memoryTag = `${config.aiProvider || 'local'}-${config.aiProvider === 'cloud' ? config.cloudEmbedModel : config.embedModel}`.replace(/[^a-z0-9_-]/gi, '_')
        const memory = new MemoryStore(path.join(this.dataDir, legacyLocal ? `memory-${id}.json` : `memory-${id}-${memoryTag}.json`), ollama)
        await memory.load(); entry.memory = memory
        const social=new SocialMemory(path.join(this.dataDir,`social-${id}.json`));await social.load();entry.social=social
        const lineage=new LineageStore(path.join(this.dataDir,`lineage-${id}.json`));await lineage.load();entry.lineage=lineage
        const learner = new LearningEngine(path.join(this.dataDir, `skills-${id}.json`), ollama, memory)
        await learner.load(); entry.learner = learner
        const biography = new Biography(path.join(this.dataDir, `biography-${id}.json`), { name: config.name, username: bot.username, gender: config.gender || 'neutral' },{weather:()=>weatherSnapshot(bot)})
        await biography.load(); entry.biography = biography
        const performance=new PerformanceTracker(path.join(this.dataDir,`performance-${id}.json`));await performance.load();entry.performance=performance
        const worldMap=new WorldMapMemory(path.join(this.dataDir,`world-map-${id}.json`));await worldMap.load();entry.worldMap=worldMap;await worldMap.sample(bot,config.visionRadius).catch(()=>{});await this.syncDiscoveries(entry).catch(()=>{});entry.mapTimer=setInterval(()=>worldMap.sample(bot,config.visionRadius).then(()=>this.syncDiscoveries(entry)).then(()=>this.publish(id)).catch(()=>{}),5000)
        const lifetime=new LifetimeStats(path.join(this.dataDir,`lifetime-${id}.json`),()=>[...this.entries.values()].filter(x=>x!==entry).map(x=>x.bot?.username||x.config.username));await lifetime.load();if(!lifetime.stats.totalPlayMs&&biography.sessions.length){lifetime.stats.totalPlayMs=biography.sessions.reduce((sum,s)=>sum+(s.endedAt?Math.max(0,new Date(s.endedAt)-new Date(s.startedAt)):0),0);await lifetime.save()}lifetime.resetSession();entry.lifetime=lifetime;await lifetime.sample(bot).catch(()=>{});entry.lifetimeTimer=setInterval(()=>lifetime.sample(bot).then(()=>this.publish(id)).catch(()=>{}),1000)
        const chestMemory=new ChestMemory(path.join(this.dataDir,`chests-${id}.json`));await chestMemory.load();entry.chestMemory=chestMemory;await chestMemory.discover(bot).catch(error=>this.log(id,'info',`Mappatura chest rimandata: ${error.message}`));entry.chestTimer=setInterval(()=>chestMemory.discover(bot).then(()=>this.publish(id)).catch(()=>{}),5000)
        await biography.startSession(`${config.host}:${config.port}`, config.personality || 'balanced')
        for (const text of knowledge) if (!memory.items.some(x => x.text === text)) await memory.add(text, { type: 'knowledge' })
        entry.agent = new Agent(bot, ollama, memory, { gender:config.gender||'neutral', personality:config.personality||'balanced', temperament:config.temperament, strength:config.strength, dexterity:config.dexterity, intelligence:config.intelligence, vitality:config.vitality, willpower:config.willpower, perception:config.perception, fear:config.fear, phobia:config.phobia, visionRadius:Number(config.visionRadius)||48, teamContext:()=>this.teamContext(id), teamCheckpoints:()=>entry.teamStore.list(40), knownChests:()=>chestMemory.list(), onStorageSeen:async(p,items,type)=>{await chestMemory.record(p,items,type);await entry.teamStore.publish({type:'chest',label:type||'chest',x:p.x,y:p.y,z:p.z,dimension:bot.game?.dimension,reporter:config.name,note:items.map(x=>`${x.name} x${x.count}`).join(', ')||'vuota',source:'storage'});this.publish(id)}, onShareCheckpoint:data=>entry.teamStore.publish({...data,reporter:config.name}), onAttackTarget:target=>lifetime.noteAttack(target), intervalMs:Number(config.intervalMs)||2500, actionTimeoutMs:Number(config.actionTimeoutMs)||45000, planTimeoutMs:Number(config.planTimeoutMs)||120000, maxSteps:0, topK:5, allowPvp:!!config.allowPvp }, {
          status: () => this.publish(id),
          log: x => this.log(id, x.level, x.message),
          decision: ({ decision, manual }) => { entry.lastGoal = decision.goal; this.log(id, 'info', `${manual ? '[prompt] ' : ''}${decision.action}: ${JSON.stringify(decision.args)}`); biography.add('decision', 'Una nuova intenzione', `${config.name} ha deciso di ${decision.goal}, scegliendo l'azione ${decision.action}.${manual ? ` L'istruzione ricevuta era: “${manual}”.` : ''}`, { decision }).catch(()=>{}) },
          result: ({ success, result, learned, timing }) => { performance.record({success,...timing}).then(()=>this.publish(id)).catch(()=>{});this.log(id, success ? 'success' : 'error', `${String(result)}${learned ? ` · Lezione: ${learned.lesson}` : ''}`); biography.add(success ? 'success' : 'failure', success ? 'Un passo avanti' : 'Una difficoltà', `${config.name} ${success ? 'è riuscito nel suo intento' : 'ha incontrato un ostacolo'}: ${result}.${learned ? ` Ha imparato: ${learned.lesson}` : ''}`, { learned }).then(() => biography.observeMilestones(learned?.delta)).catch(()=>{}) }
        }, learner)
        entry.agent.config.socialContext=()=>entry.social?{people:entry.social.people,goals:entry.social.openGoals()}:{}
        entry.agent.config.onObservation=state=>worldMap.rememberTargets(state.visibleTargets,state.dimension)
        entry.agent.config.worldKnowledge=()=>worldMap.knowledge(bot.entity?.position,bot.game?.dimension,80)
        for (const instruction of entry.pendingInstructions.splice(0)) entry.agent.instruct(instruction)
        entry.connection='online';entry.onlineSince=new Date().toISOString();const readyAt=Date.now(),startupRecord={requestedAt:new Date(entry.connectRequestedAt).toISOString(),readyAt:new Date(readyAt).toISOString(),durationMs:readyAt-entry.connectRequestedAt,model:entry.runtimeModel||config.model,provider:config.aiProvider||'local'};entry.startupHistory.push(startupRecord);if(entry.startupHistory.length>50)entry.startupHistory.splice(0,entry.startupHistory.length-50);await fs.writeFile(path.join(this.dataDir,`startup-${id}.json`),JSON.stringify(entry.startupHistory,null,2));this.log(id,'success',`Avvio completato in ${(startupRecord.durationMs/1000).toFixed(1)}s · media ultime ${Math.min(10,entry.startupHistory.length)}: ${(startupSummary(entry.startupHistory).averageMs/1000).toFixed(1)}s`)
        this.log(id, 'success', `Connesso a ${config.host}:${config.port}`)
        if (entry.startRequested) { entry.startRequested=false; entry.agent.start() }
      } catch (error) { entry.connection='error';entry.bootstrapError=error.message;entry.startRequested=false;this.log(id,'error',`Bootstrap non riuscito: ${error.message}`) }
    })
    bot.on('health', () => this.publish(id))
    bot.on('heldItemChanged',()=>this.publish(id,true))
    bot.on('entityDead', entity => entry.lifetime?.noteDeath(entity).then(killed=>{if(killed){this.log(id,'success',`Animale abbattuto: ${entity.name||'sconosciuto'}`);this.publish(id)}}).catch(()=>{}))
    bot.on('chat', (username, message) => {
      const sender=String(username||'').trim().toLowerCase()
      const selfNames=new Set([bot.username,config.username,config.name].filter(Boolean).map(x=>String(x).trim().toLowerCase()))
      // Alcuni server inoltrano i messaggi del bot con il nome configurato
      // invece dell'username Mineflayer: in entrambi i casi non va riattivato
      // il proprio agente né va avviato un dialogo con se stesso.
      if (selfNames.has(sender) || config.listenChat === false) return
      const text = String(message).trim()
      if (!text || text.startsWith('!status')) return
      const positive=/\b(grazie|bravo|aiuto|salva|ottimo|amico|bene)\b/i.test(text), negative=/\b(stupido|idiota|vattene|odio|no)\b/i.test(text)
      entry.social?.remember(username,{memory:text,trust:positive?0.03:negative?-0.03:0.01,karma:positive?0.08:negative?-0.1:0})
      entry.social?.save().catch(()=>{})
      const teammate = [...this.entries.values()].some(e => e !== entry && (e.bot?.username || e.config.username) === username)
      const addressed = text.toLowerCase().startsWith(`@${bot.username.toLowerCase()}`) || text.toLowerCase().startsWith(`@${config.name.toLowerCase()}`)
      if (/^(ciao|salve|buongiorno|buonasera|hello|hi|hey)\b/i.test(text) && !teammate) {
        bot.chat(`Ciao ${username}! Sono ${config.name}. Sto imparando: cosa stai facendo e come posso aiutarti?`)
        this.log(id, 'info', `Saluto inviato a ${username}`)
      }
      entry.biography?.add('chat', 'Voci dal mondo', `${config.name} ha letto un messaggio di ${username}: “${text}”.`, { username, addressed }).catch(()=>{})
      if (!teammate || addressed) {
        const instruction = `Conversazione sociale con ${username}. Messaggio ricevuto: “${text}”. Rispondi in chat entro questa azione con una frase coerente con la tua personalità; se il messaggio contiene un obiettivo, chiariscilo e proponi una collaborazione. Ricorda questa persona e il contesto per i prossimi incontri. Non limitarti a salutare.`
        if (entry.agent) { entry.agent.instruct(instruction); if (!entry.agent.running) entry.agent.start() } else entry.pendingInstructions.push(instruction)
        this.log(id, 'prompt', `${username} dalla chat: ${text}`)
      } else this.log(id, 'info', `Compagno ${username}: ${text}`)
    })
    bot.on('death', () => { const memorial={botId:id,name:config.name,at:new Date().toISOString(),position:bot.entity?.position?{x:Math.floor(bot.entity.position.x),y:Math.floor(bot.entity.position.y),z:Math.floor(bot.entity.position.z)}:null,dimension:bot.game?.dimension||'unknown',hardcore:!!bot.game?.hardcore};fs.appendFile(path.join(this.dataDir,'memorials.jsonl'),`${JSON.stringify(memorial)}\n`).catch(()=>{});this.log(id,'error',`Il bot è morto${memorial.position?` a ${memorial.position.x},${memorial.position.y},${memorial.position.z}`:''}`);if (entry.agent) { entry.agent.failures++; entry.agent.instruct('Commemora il difensore caduto: se hai materiali e sei in sicurezza costruisci un piccolo memoriale nel luogo della morte e scrivi un cartello con il suo nome. Non rischiare la vita per farlo.') } entry.biography?.add('death', 'La caduta', `${config.name} è morto, ma la sua storia e le sue lezioni continueranno dopo la rinascita.`,{memorial}).catch(()=>{}) })
    bot.on('kicked', reason => { entry.connection = 'kicked'; this.log(id, 'error', `Espulso: ${String(reason)}`) })
    bot.on('end', reason => { clearInterval(entry.chestTimer);clearInterval(entry.mapTimer);clearInterval(entry.lifetimeTimer);entry.lifetime?.save().catch(()=>{});entry.onlineSince=null; if (!this.entries.has(id) || entry.closing) return; entry.connection = 'offline'; entry.agent?.stop(); this.log(id, 'info', `Disconnesso: ${reason}`); entry.biography?.endSession(String(reason)).catch(()=>{}) })
    bot.on('error', error => this.log(id, 'error', error.message))
    return id
  }
  start(id) { const e=this.entries.get(id);if(!e)throw new Error('Connetti prima il bot');if(e.connection==='error')throw new Error(`Bootstrap non riuscito: ${e.bootstrapError||'disconnetti e riconnetti il bot'}`);if(!e.agent){e.startRequested=true;this.log(id,'info','Avvio richiesto: attendo il completamento del bootstrap');this.publish(id);return{queued:true}}e.agent.start();return{queued:false} }
  stop(id) { const e=this.entries.get(id);if(!e)throw new Error('Bot non connesso');e.startRequested=false;if(e.agent)e.agent.stop();this.log(id,'info','Avvio automatico annullato / AI in pausa');return true }
  prompt(id, text) { const e=this.entries.get(id);if(!e)throw new Error('Connetti prima il bot');if(!e.agent){e.pendingInstructions.push(text);e.startRequested=true;this.log(id,'prompt',`${text} (attende il bootstrap)`);return{queued:true}}e.agent.instruct(text);this.log(id,'prompt',`${text} (in coda)`);if(!e.agent.running)e.agent.start();return{queued:false} }
  promptAll(text) { let count = 0; for (const [id, e] of this.entries) { if (!e.agent) continue; e.agent.instruct(`ISTRUZIONE DI SQUADRA: ${text}`); this.log(id, 'prompt', `${text} (squadra)`); if (!e.agent.running) e.agent.start(); count++ } return count }
  stopAll() { this.scheduler.abortAll(); let count = 0; for (const [id, e] of this.entries) { if (!e.agent) continue; e.agent.stop(); this.log(id, 'error', 'STOP DI EMERGENZA: agente e richieste AI arrestati'); count++ } return count }
  biographyMarkdown(id) { const e = this.entries.get(id); if (!e?.biography) throw new Error('Biografia non disponibile'); return { name: e.config.name, markdown: e.biography.toMarkdown() } }
  benchmarkReport(id){const e=this.entries.get(id);if(!e?.performance)throw new Error('Benchmark disponibile dopo la connessione del bot');return{bot:{id,name:e.config.name,personality:e.config.personality,model:e.config.aiProvider==='cloud'?e.config.cloudModel:e.config.model,provider:e.config.aiProvider||'local',minecraftVersion:e.bot?.version},performance:e.performance.summary(Object.keys(e.biography?.milestones||{}).length),lifetime:e.lifetime?.snapshot()||null,generatedAt:new Date().toISOString()}}
  async technicalReport(id){const e=this.entries.get(id);if(!e)throw new Error('Connetti il bot per esportare le attività tecniche');const s=this.snapshot(id),c=e.config;let historical=[];try{historical=(await fs.readFile(path.join(this.dataDir,`technical-log-${id}.jsonl`),'utf8')).split(/\r?\n/).filter(Boolean).slice(-10000).map(x=>JSON.parse(x))}catch{}const all=[...historical,...e.logs],seen=new Set(),logs=all.filter(x=>{const key=`${x.at}|${x.level}|${x.message}`;if(seen.has(key))return false;seen.add(key);return true});return{generatedAt:new Date().toISOString(),bot:{id,name:c.name,username:c.username,server:`${c.host}:${c.port}`,minecraftVersion:s.minecraftVersion,provider:c.aiProvider||'local',model:c.aiProvider==='cloud'?c.cloudModel:(e.runtimeModel||c.model),embeddingModel:c.aiProvider==='cloud'?c.cloudEmbedModel:c.embedModel,personality:c.personality,visionRadius:c.visionRadius,decisionIntervalMs:c.intervalMs,actionTimeoutMs:c.actionTimeoutMs,planTimeoutMs:c.planTimeoutMs},status:{connection:s.connection,phase:s.phase,running:s.running,busy:s.busy,onlineSince:s.onlineSince,lastGoal:s.lastGoal,steps:s.steps,successes:s.successes,failures:s.failures,learnedLessons:s.learnedLessons},performance:s.performance,lifetime:s.lifetime,skills:e.learner?.summary()||[],game:s.game,logs}}
  mapData(id){const e=this.entries.get(id);if(!e?.worldMap)throw new Error('La mappa sarà disponibile dopo la connessione del bot');return{...e.worldMap.data(e.bot?.entity?.position,e.chestMemory?.list()||[]),lifetime:e.lifetime?.snapshot()||null,teamCheckpoints:e.teamStore?.list(200)||[]}}
  async generateEpicBook(id, onProgress) {
    const protagonist = this.entries.get(id)
    if (!protagonist?.biography || !protagonist.ollama) throw new Error('Connetti il bot protagonista prima di generare il libro')
    const biographies = []
    try {
      const files = (await fs.readdir(this.dataDir)).filter(name => /^biography-.*\.json$/.test(name))
      for (const file of files) { try { const data = JSON.parse(await fs.readFile(path.join(this.dataDir, file), 'utf8')); if (data.identity && Array.isArray(data.events)) biographies.push({ identity: data.identity, events: data.events }) } catch {} }
    } catch {}
    if (!biographies.some(b => b.identity.username === protagonist.biography.identity.username)) biographies.push({ identity: protagonist.biography.identity, events: protagonist.biography.events })
    const source = prepareChronicle(protagonist.biography.identity, biographies)
    const markdown = await new EpicBookGenerator(protagonist.ollama).generate(source, onProgress)
    return { name: protagonist.config.name, markdown }
  }
  async disconnect(id) { const e = this.entries.get(id); if (!e) return; e.closing = true; clearInterval(e.chestTimer);clearInterval(e.mapTimer);clearInterval(e.lifetimeTimer); e.agent?.stop();await e.lifetime?.save(); await e.biography?.endSession('Disconnessione dalla dashboard'); e.bot?.quit('Dashboard disconnect'); this.entries.delete(id); this.emit('removed', id) }
  closeAll() { for (const id of [...this.entries.keys()]) this.disconnect(id) }
}
