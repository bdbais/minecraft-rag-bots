import { autonomousProgressionDecision, basicProgressionDecision, craftableBasicRecipes, decisionSchema, execute, normalizeDecision } from './actions.js'
import { trapEscapeDecision } from './trap-escape.js'
import { observe } from './observe.js'
import { personalityPrompt } from './personalities.js'
import { psychProfile } from './traits.js'
import { campaignState } from './campaign.js'
import { exploreStrategies } from './strategy-search.js'

const baseSystem = config => `You control a Minecraft bot. Adapt to the detected game mode: survival requires hunger, health, resources and crafting; creative permits building and unlimited resources but still requires deliberate construction; adventure generally forbids breaking blocks, so interact, explore and collaborate; spectator must not attempt physical actions and should observe/report only. Work incrementally toward defeating the Ender Dragon when the mode permits it.
Identity gender: ${config.gender || 'neutral'}. Use identity-consistent language when referring to yourself, without stereotypes.
Personality and role: ${personalityPrompt(config.personality)}
Persistent profession: ${config.profession || 'wanderer'}. Let this profession shape priorities while remaining adaptable: farmer grows food, breeder raises animals, warrior protects the group, hunter obtains food, fisher maintains water-based food supplies, builder creates infrastructure, explorer/wanderer maps the world, scientist experiments with mechanisms, priest/nun supports the community and records memories, trader manages exchanges. Perform verifiable actions and learn from outcomes.
${psychProfile(config).prompt}
Choose only one provided action. Args by action:
wait {ms}; chat {message}; unstuck {}; escape_hazard {}; move_to {x,y,z,range}; explore {radius}; navigate_boat {durationMs}; enter_portal {}; activate_end_portal {}; follow_player {username,range}; give_item {username,name,count}; share_checkpoint {type,label,x?,y?,z?,note}; collect_wood {count}; collect_block {name,count,maxDistance}; collect_drops {maxDistance}; collect_fluid {fluid,maxDistance}; cool_lava {maxDistance}; harvest_crops {count,maxDistance}; plant_crops {count,maxDistance}; prepare_farm {maxDistance}; inspect_storage {}; store_items {maxDistance}; read_sign {maxDistance}; write_sign {lines,text,maxDistance}; craft {name,count}; equip {name,destination}; eat {name?}; build_shelter {}; build_door {}; build_portal {}; build_pen {}; breed_animals {species}; build_memorial {}; attack_nearest {}; stop {}.
Use collect_wood instead of guessing a tree species: it searches oak, birch, spruce, jungle, acacia, dark oak, mangrove, cherry, stems and hyphae. If none is loaded, explore and try again. The craft action automatically crafts available intermediate ingredients (for example logs into planks), so use it when raw materials are in inventory. inspect_storage reads a discovered chest or barrel. TEAMMATES provide facts shared directly by nearby bots. TEAM CHECKPOINTS are persistent server-wide coordinates; use move_to to reach useful ones and share_checkpoint when you discover a chest, mine, dungeon, special monster, resource, danger, portal or base.
This is a cooperative campaign with one shared final objective: defeat the Ender Dragon. Progress through phases in order: survive and establish shelter; obtain tools, food and iron; prepare Nether access and blaze rods; obtain ender pearls and Eyes of Ender; locate the stronghold; coordinate an End expedition; destroy crystals and defeat the dragon. Select a temporary team role from your personality (gatherer, builder, explorer, scout, defender or speedrunner), announce the role and important findings with chat/share_checkpoint, and do not duplicate a teammate’s current goal. When a nearby player gives an instruction, acknowledge it in chat and execute it if safe. Ask nearby teammates for missing materials, deliver surplus with give_item, and report failures so the next bot can try a different strategy. Never claim an action happened before its result. Be cautious below 10 health or 8 food. Do not attack players.
Crafting names: use crafting_table (not workbench), oak_planks/birch_planks/etc. (not plank), wooden_axe/stone_axe, color_bed such as white_bed, and chest. Generic plank/planks, workbench, axe, bed and container aliases are accepted and resolved from inventory. The craft action creates intermediate ingredients and, when required, creates, places and uses a crafting table automatically. Return schema-compliant JSON only.`

export class Agent {
  constructor(bot, ollama, memory, config, events = {}, learner = null) { this.bot = bot; this.ollama = ollama; this.memory = memory; this.config = config; this.events = events; this.learner = learner; this.running = false; this.busy = false; this.phase = 'idle'; this.steps = 0; this.successes = 0; this.failures = 0; this.instructions = []; this.activeInstruction = ''; this.activeInstructionSteps = 0; this.generation = 0; this.planningController = null;this.actionFailures={};this.noProgressSteps=0;this.lastProgressSignature='';this.socialGreetings=new Map();this.helpRequests=new Map();this.strategyTrials={} }
  instruct(text) { if (String(text).trim()) { this.instructions.push(String(text).trim()); this.interrupt('Nuova istruzione manuale') } }
  emit(type, payload = {}) { this.events[type]?.(payload) }
  async cancelAction() {
    this.bot.pathfinder?.setGoal(null)
    try { await this.bot.collectBlock?.cancelTask?.() } catch {}
  }
  interrupt(reason = 'Interrotto') { this.generation++; this.planningController?.abort(new Error('INTERRUPTED')); this.cancelAction(); this.emit('log', { level: 'info', message: `${reason}: ripianificazione in corso` }) }
  async withTimeout(promise, ms, label) {
    let timer
    try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`${label} bloccata oltre ${Math.round(ms / 1000)}s`)), ms) })]) }
    finally { clearTimeout(timer) }
  }
  progressSignature(){const p=this.bot.entity?.position,items=this.bot.inventory?.items?.()||[];return`${p?`${Math.round(p.x*4)},${Math.round(p.y*4)},${Math.round(p.z*4)}`:'none'}|${items.map(x=>`${x.name}:${x.count}`).sort().join(',')}|${this.bot.health}|${this.bot.food}`}
  async withProgressWatchdog(promise,totalMs,label,stallMs=15000){let totalTimer,watchTimer,last=this.progressSignature(),lastChange=Date.now();const guarded=new Promise((resolve,reject)=>{totalTimer=setTimeout(()=>reject(new Error(`${label} bloccata oltre ${Math.round(totalMs/1000)}s`)),totalMs);watchTimer=setInterval(()=>{const current=this.progressSignature();if(current!==last){last=current;lastChange=Date.now()}else if(Date.now()-lastChange>=stallMs)reject(new Error(`${label}: nessun progresso da ${Math.round(stallMs/1000)}s`))},Math.min(1000,Math.max(25,stallMs/3)));promise.then(resolve,reject)});try{return await guarded}finally{clearTimeout(totalTimer);clearInterval(watchTimer)}}
  async start() {
    if (this.running) return
    this.running = true
    this.emit('status', { running: true })
    while (this.running && (!this.config.maxSteps || this.steps < this.config.maxSteps)) {
      await this.step().catch(error => { if (error.message !== 'INTERRUPTED') { this.failures++; this.emit('log', { level: 'error', message: `Agent: ${error.message}` }) } })
      await new Promise(resolve => setTimeout(resolve, this.config.intervalMs))
    }
  }
  stop() { this.running = false; this.generation++; this.cancelAction(); this.busy = false; this.phase = 'paused'; this.emit('status', { running: false }) }
  async step() {
    const stepStarted=Date.now();let planningMs=0,actionMs=0
    const generation = this.generation
    this.busy = true; this.phase = 'retrieval'; this.emit('status', { running: true })
    try {
    const state = observe(this.bot,{visionRadius:this.config.visionRadius}); state.profession=this.config.profession||'wanderer'; state.knownStorage = typeof this.config.knownChests === 'function' ? this.config.knownChests() : [];state.availableBasicRecipes=craftableBasicRecipes(this.bot)
    await this.config.onObservation?.(state)
    const worldKnowledge=typeof this.config.worldKnowledge==='function'?this.config.worldKnowledge():{}
    const query = `Goal: finish Minecraft. Current state: ${JSON.stringify(state)}`
    const memories = await this.memory.search(query, this.config.topK)
    if (generation !== this.generation) throw new Error('INTERRUPTED')
    const nextInstruction = this.instructions.shift()
    if (nextInstruction) { this.activeInstruction = nextInstruction; this.activeInstructionSteps = 12 }
    const manual = this.activeInstructionSteps > 0 ? this.activeInstruction : ''
    if (!nextInstruction && this.activeInstructionSteps > 0) this.activeInstructionSteps--
    const teamBase = typeof this.config.teamContext === 'function' ? this.config.teamContext() : []
    const social = typeof this.config.socialContext === 'function' ? this.config.socialContext() : {}
    const team = [...teamBase, { socialMemory: social }]
    const checkpoints = typeof this.config.teamCheckpoints === 'function' ? this.config.teamCheckpoints() : []
    const society = typeof this.config.societyContext === 'function' ? this.config.societyContext() : {}
    const campaign = campaignState(state, checkpoints)
    const prompt = `CURRENT OBSERVATION (visible now; absence does not erase memory):\n${JSON.stringify(state, null, 2)}\n\nWORLD KNOWLEDGE (persistent discoveries; use coordinates to revisit known resources and places):\n${JSON.stringify(worldKnowledge,null,2)}\n\nTEAMMATES (coordinate, do not duplicate work):\n${JSON.stringify(team, null, 2)}\n\nSOCIAL KARMA: positive karma indicates people who helped or acted kindly; negative karma indicates betrayal, insults or danger. Let it change who you trust, whom you help, and how cautiously you share resources. Do not punish someone forever: update your judgement after new evidence.\n\nTEAM CHECKPOINTS (persistent shared coordinates):\n${JSON.stringify(checkpoints, null, 2)}\n\nRETRIEVED KNOWLEDGE AND EXPERIENCE:\n${memories.map((m, i) => `${i + 1}. ${m.text}`).join('\n') || 'none'}\n\n${manual ? `HUMAN INSTRUCTION (highest priority if safe and possible): ${manual}\n\n` : ''}Select the next small action.`
    this.phase = 'planning'; this.emit('status', { running: true })
    this.planningController = new AbortController()
    let decision=trapEscapeDecision(manual)||basicProgressionDecision(this.bot,manual)
    if(decision?.action==='dig_escape'){const helper=state.nearbyEntities?.find(x=>x?.type==='player'&&x.username&&x.username!==this.bot.username);const key=`${Math.floor(this.bot.entity.position.x)},${Math.floor(this.bot.entity.position.y)},${Math.floor(this.bot.entity.position.z)}`;if(helper&&!this.helpRequests.has(key)){this.helpRequests.set(key,Date.now());decision={thought:'Un compagno è vicino: chiedere aiuto prima di rischiare.',goal:`chiedere aiuto a ${helper.username}`,action:'chat',args:{message:`@${helper.username} aiuto: sono intrappolata, puoi liberarmi o scavare un passaggio?`},expected:'un compagno interviene nella trappola'}}}
    const hazard=Array.isArray(state.nearbyBlocks)&&state.nearbyBlocks.some(x=>/lava|water/i.test(typeof x==='string'?x:x.name||''))
    const nearbyPlayer=Array.isArray(state.nearbyEntities)&&state.nearbyEntities.find(x=>x?.type==='player'&&x?.username&&x.username!==this.bot.username)
    const dangerousVisible=Array.isArray(state.visibleTargets)&&state.visibleTargets.some(x=>/spawner|end_gateway|portal/i.test(String(x?.name||'')))
    const armedNow=(this.bot.inventory?.items?.()||[]).some(x=>/_sword$|_axe$|bow|crossbow/.test(x.name)&&Number(x.count)>0)
    if(!manual&&!hazard&&nearbyPlayer&&!(dangerousVisible&&!armedNow)){const items=this.bot.inventory?.items?.()||[],hasFood=items.some(x=>/bread|apple|beef|porkchop|chicken|mutton|carrot|potato|melon|cod|salmon/.test(x.name)&&Number(x.count)>0),hasWood=items.some(x=>/(_log|_wood|_stem|_hyphae|_planks)$/.test(x.name)&&Number(x.count)>0),hasStone=items.some(x=>/cobblestone|stone|deepslate/.test(x.name)&&Number(x.count)>0),last=this.socialGreetings.get(nearbyPlayer.username)||0;if(Number(state.food)<8&&!hasFood&&Date.now()-last>120000){this.socialGreetings.set(nearbyPlayer.username,Date.now());decision={thought:'Cooperazione: fame bassa e nessuna scorta, chiedere cibo a un compagno vicino.',goal:`chiedere cibo a ${nearbyPlayer.username}`,action:'chat',args:{message:`@${nearbyPlayer.username} ho poca fame e non ho cibo. Puoi condividere una razione? Ti aiuterò appena possibile.`},expected:'richiesta di cibo inviata'}}else if(!hasWood&&!hasStone&&Date.now()-last>120000){this.socialGreetings.set(nearbyPlayer.username,Date.now());decision={thought:'Cooperazione iniziale: mancano materiali di base, chiedere una risorsa al compagno.',goal:`chiedere materiali base a ${nearbyPlayer.username}`,action:'chat',args:{message:`@${nearbyPlayer.username} sto iniziando la spedizione e mi mancano legno o pietra. Puoi condividere qualche blocco? Ti restituirò le risorse.`},expected:'richiesta di materiali inviata'}}else if(Date.now()-last>120000){this.socialGreetings.set(nearbyPlayer.username,Date.now());decision={thought:'Interazione sociale: un giocatore è vicino.',goal:`salutare ${nearbyPlayer.username}`,action:'chat',args:{message:`Ciao ${nearbyPlayer.username}! Sono ${this.config.name||this.bot.username}, posso aiutarti?`},expected:'saluto inviato'}}}
    if(!manual&&hazard) decision={thought:'Pericolo ambientale vicino: prima mettersi in salvo.',goal:'uscire da lava o acqua',action:'escape_hazard',args:{},expected:'raggiungere una casella solida sicura'}
    if(!decision&&!manual) decision=autonomousProgressionDecision(this.bot,state,checkpoints)
    if(!decision)try { const started=Date.now();decision = await this.withTimeout(this.ollama.decide(baseSystem(this.config), `SERVER SOCIETY: ${JSON.stringify(society)}\n\nCAMPAIGN STATE (verified): ${JSON.stringify(campaign)}\n\n${prompt}`, decisionSchema, this.planningController.signal), Number(this.config.planTimeoutMs) || 120000, 'Pianificazione');planningMs=Date.now()-started }
    catch (error) { if (generation !== this.generation || this.planningController.signal.aborted) throw new Error('INTERRUPTED'); throw error }
    finally { this.planningController = null }
    decision=basicProgressionDecision(this.bot,manual)||decision||normalizeDecision(this.bot,decision)
if(!manual&&decision?.action==='chat'&&/ho trovato (?:uno spawner|spawner|un portale|portale|un end_gateway|end_gateway)/i.test(String(decision.args?.message||''))){const key=`danger-help:${String(decision.args.message)}`;const last=this.helpRequests.get(key)||0;if(Date.now()-last<120000)decision={thought:'Richiesta già inviata: attendo il compagno senza intasare la chat.',goal:'attendere assistenza sul pericolo segnalato',action:'wait',args:{ms:4000},expected:'tempo per l’intervento del compagno'};else this.helpRequests.set(key,Date.now())}
    if(!manual&&decision?.action==='chat'){const key=`chat:${String(decision.args?.message||'').trim()}`;const last=this.socialGreetings.get(key)||0;if(Date.now()-last<30000)decision={thought:'Dialogo già inviato di recente: lasciare spazio alla risposta dell’interlocutore.',goal:'attendere una risposta senza ripetere il messaggio',action:'wait',args:{ms:4000},expected:'chat non duplicata'};else this.socialGreetings.set(key,Date.now())}
    const currentSignature=this.progressSignature()
    if(!manual && currentSignature===this.lastProgressSignature) this.noProgressSteps++; else this.noProgressSteps=0
    this.lastProgressSignature=currentSignature
    if(!manual && this.noProgressSteps>=3){
      const items=this.bot.inventory?.items?.()||[], wood=items.filter(x=>/(_log|_wood|_stem|_hyphae)$/.test(x.name)).reduce((n,x)=>n+x.count,0), building=items.some(x=>/^(dirt|cobblestone|stone|deepslate|.*_planks)$/.test(x.name))
      decision=wood<2?{thought:'Ciclo improduttivo: raccolta deterministica del legno.',goal:'raccogliere materiali base',action:'collect_wood',args:{count:4},expected:'legno nell inventario'}:building?{thought:'Ciclo improduttivo: costruzione di un riparo.',goal:'costruire un riparo sicuro',action:'build_shelter',args:{},expected:'blocchi posizionati'}:{thought:'Ciclo improduttivo: esplorazione per trovare risorse.',goal:'esplorare e trovare risorse',action:'explore',args:{radius:24},expected:'nuova area esplorata'}
      this.noProgressSteps=0;this.emit('log',{level:'info',message:`Watchdog: nessun progresso da 3 cicli, avvio recupero ${decision.action}`})
    }
    if (generation !== this.generation) throw new Error('INTERRUPTED')
    if((this.actionFailures[decision.action]||0)>=2&&!['unstuck','wait','chat','stop','escape_hazard','build_shelter'].includes(decision.action)){const blocked=decision.action,alternatives=exploreStrategies(state,this.actionFailures),trial=this.strategyTrials[blocked]||0;if(trial<3){const candidate=alternatives[trial%alternatives.length];this.strategyTrials[blocked]=trial+1;decision={...candidate,thought:`Ricerca fuzzy dopo fallimenti di ${blocked}: provo una combinazione alternativa.`,expected:'un cambiamento osservabile',recoveryFor:blocked};this.emit('log',{level:'info',message:`Fuzzy recovery: ${blocked} fallita, provo ${candidate.action} (tentativo ${trial+1}/3)`})}else{decision={...decision,thought:`Recupero automatico dopo fallimenti ripetuti di ${blocked}.`,action:'unstuck',args:{},expected:'Cambiare posizione e liberare il movimento',recoveryFor:blocked};this.emit('log',{level:'info',message:`Recovery: ${blocked} è fallita ripetutamente, eseguo una manovra di sblocco`})}}
    const inventory=this.bot.inventory?.items?.()||[]
    if(decision.action==='build_shelter'&&!inventory.some(x=>/^(dirt|cobblestone|stone|deepslate|.*_planks)$/.test(x.name)&&x.count>0)){
      decision={thought:'Il riparo non è ancora possibile: servono blocchi da costruzione.',goal:'raccogliere materiali prima di costruire il riparo',action:'collect_wood',args:{count:4},expected:'blocchi utili nell inventario',recoveryFor:'build_shelter'}
      this.emit('log',{level:'info',message:'Recovery: build_shelter senza materiali, raccolgo prima risorse'})
    }
    if(decision.action==='dig_escape'&&(this.actionFailures.dig_escape||0)>=2){
      const support=inventory.find(x=>/dirt|cobblestone|stone|netherrack|deepslate|sand|gravel|planks/.test(x.name)&&x.count>0)
      if(support){decision={thought:'Il passaggio orizzontale non porta fuori: usare una fuga verticale controllata, evitando acqua e lava.',goal:'scavare verso l’alto e uscire dal dungeon',action:'vertical_escape',args:{maxSteps:12},expected:'salire fino a uno spazio aperto',recoveryFor:'dig_escape'};this.emit('log',{level:'info',message:'Recovery: dig_escape fallita, provo fuga verticale con colonna di supporto'})}
    }
    if(decision.action==='escape_hazard'&&(this.actionFailures.escape_hazard||0)>=2){
      const pickaxe=inventory.find(x=>/_pickaxe$/.test(x.name)); decision=pickaxe?{thought:'La fuga ambientale fallisce: cambiare piano e scavare un passaggio sicuro.',goal:'scavare una via alternativa lontano dal fluido',action:'dig_escape',args:{},expected:'passaggio libero dalla zona pericolosa',recoveryFor:'escape_hazard'}:{thought:'La fuga ambientale fallisce senza attrezzi: esplorare un percorso alternativo.',goal:'allontanarsi dalla zona pericolosa con un percorso diverso',action:'explore',args:{radius:16},expected:'nuova posizione lontana dal pericolo',recoveryFor:'escape_hazard'}
      this.emit('log',{level:'info',message:`Recovery: escape_hazard fallita, cambio strategia in ${decision.action}`})
    }
    if(decision.action==='collect_wood'&&(this.actionFailures.collect_wood||0)>=2){
      decision={thought:'La raccolta del legno non produce progresso: cambiare zona prima di riprovare.',goal:'esplorare una nuova area per trovare alberi',action:'explore',args:{radius:32},expected:'nuova area caricata con possibili risorse',recoveryFor:'collect_wood'}
      this.emit('log',{level:'info',message:'Recovery: collect_wood fallita, esploro una nuova area'})
    }
    this.steps++; this.emit('decision', { decision, state, manual })
    // Il learner deve ricevere lo snapshot strutturato, non la stringa usata
    // soltanto per il diario: stateDelta altrimenti non vede inventario e posizione.
    const before = state
    let result, success = true
    this.phase = 'acting'; this.emit('status', { running: true })
    try { const started=Date.now(),operation=execute(this.bot,decision,this.config),passive=['wait','chat','stop','share_checkpoint','craft','equip','eat','fish','unstuck','collect_wood','collect_block','collect_drops'].includes(decision.action);result = passive?await this.withTimeout(operation,Number(this.config.actionTimeoutMs)||45000,`Azione ${decision.action}`):await this.withProgressWatchdog(operation,Number(this.config.actionTimeoutMs)||45000,`Azione ${decision.action}`,Number(this.config.stallTimeoutMs)||15000);actionMs=Date.now()-started } catch (error) { actionMs=Date.now()-stepStarted-planningMs;await this.cancelAction(); success = false; result = error.message }
    if (generation !== this.generation) throw new Error('INTERRUPTED')
    const after = observe(this.bot,{visionRadius:this.config.visionRadius});after.availableBasicRecipes=craftableBasicRecipes(this.bot);const unlocked=after.availableBasicRecipes.filter(x=>!state.availableBasicRecipes.includes(x));if(unlocked.length){const notice=`Nuove ricette disponibili: ${unlocked.join(', ')}`;this.emit('log',{level:'success',message:notice});await this.memory.add(notice,{type:'recipe_unlock',recipes:unlocked})}
    let learned = null
    if (this.learner) learned = await this.learner.learn({ before: state, after, decision, manual, executionSuccess: success, result, step: this.steps })
    else {
      const experience = `Human instruction: ${manual || 'none'}. Goal: ${decision.goal}. State: ${before}. Action: ${decision.action} ${JSON.stringify(decision.args)}. Result: ${success ? 'SUCCESS' : 'FAILURE'}: ${result}.`
      await this.memory.add(experience, { type: 'experience', success, action: decision.action, manualInstruction: manual || null })
    }
    const effectiveSuccess = learned ? learned.achieved : success
    if(effectiveSuccess){if(decision.action==='unstuck'){const recovered=decision.recoveryFor; if(recovered)this.actionFailures[recovered]=Math.max(2,this.actionFailures[recovered]||2); else this.actionFailures={}}else this.actionFailures[decision.action]=0}else this.actionFailures[decision.action]=(this.actionFailures[decision.action]||0)+1
    if (effectiveSuccess) this.successes++; else this.failures++
    this.emit('result', { success: effectiveSuccess, result, decision, state: after, learned, timing:{totalMs:Date.now()-stepStarted,planningMs,actionMs} })
    if (decision.action === 'stop') this.stop()
    } finally { this.busy = false; if (this.running) this.phase = 'waiting'; this.emit('status', { running: this.running }) }
  }
}

