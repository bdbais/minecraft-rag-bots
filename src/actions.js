import pathfinderPackage from 'mineflayer-pathfinder'
import { Vec3 } from 'vec3'

const { goals, Movements } = pathfinderPackage

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const names = ['wait', 'chat', 'unstuck', 'escape_hazard', 'move_to', 'explore', 'follow_player', 'give_item', 'share_checkpoint', 'collect_wood', 'collect_block', 'collect_drops', 'inspect_storage', 'craft', 'equip', 'eat', 'build_shelter', 'attack_nearest', 'stop']
const isWood = block => /(_log|_wood|_stem|_hyphae)$/.test(block?.name || '')

const itemCount = (bot, id, metadata = null) => bot.inventory.count(id, metadata)
const inventoryTotal=(bot,filter=()=>true)=>(bot.inventory?.items?.()||[]).filter(filter).reduce((n,x)=>n+(x.count||0),0)
async function collectNearbyDrops(bot,maxDistance=16){await sleep(700);const drops=Object.values(bot.entities||{}).filter(e=>e.name==='item'&&e.position?.distanceTo(bot.entity.position)<=maxDistance).sort((a,b)=>a.position.distanceTo(bot.entity.position)-b.position.distanceTo(bot.entity.position));for(const drop of drops.slice(0,20)){try{await bot.pathfinder.goto(new goals.GoalNear(drop.position.x,drop.position.y,drop.position.z,1));await sleep(350)}catch{}}await sleep(900)}
async function findWoodWithExploration(bot,count){await sleep(1200);let positions=bot.findBlocks({matching:isWood,maxDistance:64,count});if(positions.length)return positions;const origin=bot.entity.position,offsets=[[32,0],[0,32],[-32,0],[0,-32],[48,48],[-48,-48]];for(const [dx,dz] of offsets){try{await bot.pathfinder.goto(new goals.GoalXZ(Math.floor(origin.x+dx),Math.floor(origin.z+dz)))}catch{}await sleep(800);positions=bot.findBlocks({matching:isWood,maxDistance:64,count});if(positions.length)return positions}return[]}
export function resolveCraftName(bot,requested){
  let name=String(requested||'').toLowerCase().trim().replace(/[^a-z0-9_ ]/g,'').replace(/ +/g,'_'),items=bot.inventory.items?.()||[],names=new Set(items.map(x=>x.name))
  const aliases={plank:'planks',wooden_plank:'planks',wooden_planks:'planks',assi:'planks',asse:'planks',workbench:'crafting_table',workbenche:'crafting_table',craftingtable:'crafting_table',banco:'crafting_table',banco_da_lavoro:'crafting_table',cassa:'chest',baule:'chest',contenitore:'chest',container:'chest',storage:'chest',letto:'bed',ascia:'axe',asce:'axe',piccone:'pickaxe',pala:'shovel',zappa:'hoe',spada:'sword',scudo:'shield',fornace:'furnace',torcia:'torch',torce:'torch',secchio:'bucket',acciarino:'flint_and_steel',porta:'door',barca:'boat',cartello:'sign',staccionata:'fence',botola:'trapdoor',lastra:'slab',scale:'ladder',scala:'ladder',arco:'bow',freccia:'arrow',frecce:'arrow',canna_da_pesca:'fishing_rod',elmo:'helmet',corazza:'chestplate',pantaloni:'leggings',stivali:'boots'}
  name=aliases[name]||name
  const existingPlanks=items.find(x=>/_planks$/.test(x.name))?.name,log=items.find(x=>/(_log|_wood|_stem|_hyphae)$/.test(x.name))?.name
  const wood=existingPlanks||log?.replace(/_(log|wood)$/,'_planks').replace(/_(stem|hyphae)$/,'_planks')||'oak_planks',species=wood.replace(/_planks$/,'')
  const tierFor=tool=>{const costs={pickaxe:3,axe:3,shovel:1,hoe:2,sword:2},cost=costs[tool]||1;if(inventoryTotal(bot,x=>x.name==='diamond')>=cost)return'diamond';if(inventoryTotal(bot,x=>x.name==='iron_ingot')>=cost)return'iron';if(inventoryTotal(bot,x=>x.name==='cobblestone'||x.name==='blackstone')>=cost)return'stone';return'wooden'}
  if(name==='planks')name=wood
  if(['pickaxe','axe','shovel','hoe','sword'].includes(name))name=`${tierFor(name)}_${name}`
  if(name==='bed'){const wool=items.find(x=>/_wool$/.test(x.name))?.name||'white_wool';name=wool.replace(/_wool$/,'_bed')}
  if(['door','boat','sign','fence','trapdoor','slab','stairs','button','pressure_plate'].includes(name))name=`${species}_${name}`
  if(['helmet','chestplate','leggings','boots'].includes(name)){const tier=names.has('diamond')?'diamond':names.has('iron_ingot')?'iron':names.has('gold_ingot')?'golden':'leather';name=`${tier}_${name}`}
  if(/_plank$/.test(name))name+='s'
  return name
}
async function ensureCraftingTable(bot,depth){let table=bot.findBlock({matching:bot.registry.blocksByName.crafting_table?.id,maxDistance:6});if(table)return table;let item=bot.inventory.items().find(x=>x.name==='crafting_table');if(!item){await craftItem(bot,'crafting_table',1,depth+1);item=bot.inventory.items().find(x=>x.name==='crafting_table')}if(!item)throw new Error('banco da lavoro creato ma non presente nell’inventario');await bot.equip(item,'hand');const p=bot.entity.position.floored?bot.entity.position.floored():bot.entity.position;for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const floor=bot.blockAt(new Vec3(Math.floor(p.x)+dx,Math.floor(p.y)-1,Math.floor(p.z)+dz)),air=bot.blockAt(new Vec3(Math.floor(p.x)+dx,Math.floor(p.y),Math.floor(p.z)+dz));if(!floor||floor.boundingBox!=='block'||(air&&!/^(air|cave_air|void_air)$/.test(air.name)))continue;try{await bot.placeBlock(floor,new Vec3(0,1,0));await sleep(300);table=bot.findBlock({matching:bot.registry.blocksByName.crafting_table?.id,maxDistance:6});if(table)return table}catch{}}throw new Error('impossibile posare il banco da lavoro accanto al bot')}
export async function craftItem(bot, name, count = 1, depth = 0) {
  if (depth > 8) throw new Error(`catena di crafting troppo profonda per ${name}`)
  name=resolveCraftName(bot,name)
  const item = bot.registry.itemsByName[name]
  if (!item) throw new Error(`oggetto sconosciuto: ${name}`)
  const wanted = Math.max(1, Math.min(Number(count) || 1, 16))
  let table = bot.findBlock({ matching: bot.registry.blocksByName.crafting_table?.id, maxDistance: 6 })
  let recipe = bot.recipesFor(item.id, null, wanted, table)[0]
  if (!recipe) {
    const inventoryNames=new Set(bot.inventory.items?.().map(x=>x.name)||[])
    const recipeScore=r=>r.delta.filter(x=>x.count<0).reduce((score,need)=>{const ingredient=bot.registry.items[need.id]?.name||'';if(itemCount(bot,need.id,need.metadata)>=Math.abs(need.count))return score+100;if(ingredient.endsWith('_planks')){const wood=ingredient.replace(/_planks$/,'_log'),stem=ingredient.replace(/_planks$/,'_stem');if(inventoryNames.has(wood)||inventoryNames.has(stem))return score+50}return score},0)
    const candidates = bot.recipesAll(item.id, null, table || true).sort((x,y)=>recipeScore(y)-recipeScore(x))
    const candidate = candidates[0]
    if (!candidate) throw new Error(`nessuna ricetta utilizzabile per ${name}${!table ? ' (potrebbe servire un banco da lavoro)' : ''}`)
    if(candidate.requiresTable&&!table)table=await ensureCraftingTable(bot,depth)
    const crafts = Math.ceil(wanted / Math.max(1, candidate.result.count || 1))
    for(let pass=0;pass<4;pass++){let missingAny=false;for (const need of candidate.delta.filter(x => x.count < 0)) {
      const required = Math.abs(need.count) * crafts
      const missing = required - itemCount(bot, need.id, need.metadata)
      if (missing <= 0) continue
      missingAny=true;const ingredient = bot.registry.items[need.id]
      if (!ingredient) throw new Error(`ingrediente ${need.id} non riconosciuto per ${name}`)
      await craftItem(bot, ingredient.name, missing, depth + 1)
    }if(!missingAny)break}
    if(!table)table = bot.findBlock({ matching: bot.registry.blocksByName.crafting_table?.id, maxDistance: 6 })
    recipe = bot.recipesFor(item.id, null, wanted, table)[0]
  }
  if (!recipe) throw new Error(`materiali insufficienti per ${name}`)
  const crafts = Math.ceil(wanted / Math.max(1, recipe.result.count || 1))
  await bot.craft(recipe, crafts, table)
  return `crafted ${wanted} ${name}${table?' usando il banco da lavoro':''}`
}

export const decisionSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    thought: { type: 'string' }, goal: { type: 'string' }, action: { type: 'string', enum: names },
    args: { type: 'object', additionalProperties: true }, expected: { type: 'string' }
  }, required: ['thought', 'goal', 'action', 'args', 'expected']
}

export function normalizeDecision(bot,decision){const args={...(decision.args||{})},goal=String(decision.goal||'').toLowerCase();if(decision.action==='collect_block'){args.name=args.name||args.blockType||args.targetBlockType;args.count=args.count||args.quantity;args.maxDistance=args.maxDistance||args.range}if(decision.action==='move_to')args.range=args.range||args.maxDistance;if(decision.action==='craft'){const goalItem=/chest|cassa|baule|contenitore/.test(goal)?'chest':/workbench|crafting.?table|banco/.test(goal)?'crafting_table':/pickaxe|piccon/.test(goal)?'pickaxe':/axe|asci/.test(goal)?'axe':null;args.name=goalItem||args.name||args.result||args.tool||args.item||args.recipe;args.count=args.count||args.quantity||1}return{...decision,args}}

export function craftableBasicRecipes(bot){const targets=['crafting_table','chest','wooden_axe','wooden_pickaxe','stone_axe','stone_pickaxe','furnace','torch','white_bed'];return targets.filter(name=>{const item=bot.registry?.itemsByName?.[name];if(!item)return false;try{return bot.recipesFor(item.id,null,1,true).length>0}catch{return false}})}

export function basicProgressionDecision(bot,instruction=''){const text=String(instruction).toLowerCase(),items=bot.inventory?.items?.()||[],has=name=>items.some(x=>x.name===name),wood=items.reduce((n,x)=>n+(/(_log|_wood|_stem|_hyphae)$/.test(x.name)?x.count:0),0),planks=items.reduce((n,x)=>n+(/_planks$/.test(x.name)?x.count:0),0),table=has('crafting_table')||!!bot.findBlock?.({matching:bot.registry?.blocksByName?.crafting_table?.id,maxDistance:6});
  if(/raccogli|prendi|collect/.test(text)&&/legn|tronco|wood|log/.test(text))return{thought:'Ordine esplicito: raccolta deterministica del legno.',goal:'raccogliere legna',action:'collect_wood',args:{count:4},expected:'legno nell inventario'}
  if(/impugna|equipaggia|tieni|usa|equip/.test(text)){const requested=text.match(/(?:impugna|equipaggia|tieni|usa|equip)\s+(?:il|la|un|una)?\s*([a-z0-9_ -]+)/)?.[1]?.trim();const item=items.find(x=>requested&&(`${x.name} ${x.displayName||''}`).toLowerCase().includes(requested))||items.find(x=>/pickaxe|axe|sword|shovel|hoe|torch|shel|food|bread/.test(x.name));if(item)return{thought:'Ordine esplicito: equipaggiamento deterministico.',goal:`impugnare ${item.name}`,action:'equip',args:{name:item.name,destination:'hand'},expected:`${item.name} in mano`}}
  const requested=/banco|workbench|crafting table|chest|cassa|baule|contenitore|asci|axe|piccon|pickaxe/.test(text);if(!requested)return null;if(!table){if(wood<1&&planks<4)return{thought:'Progressione base deterministica: prima serve legno reale.',goal:'raccogliere legno per il banco da lavoro',action:'collect_wood',args:{count:4},expected:'ottenere almeno un tronco'};return{thought:'Progressione base deterministica: materiali disponibili per il banco.',goal:'creare il banco da lavoro',action:'craft',args:{name:'crafting_table',count:1},expected:'banco da lavoro nell inventario'}}if(/asci|axe/.test(text)&&!items.some(x=>/_axe$/.test(x.name)))return{thought:'Progressione base deterministica.',goal:'creare un ascia',action:'craft',args:{name:'axe',count:1},expected:'ascia nell inventario'};if(/piccon|pickaxe/.test(text)&&!items.some(x=>/_pickaxe$/.test(x.name)))return{thought:'Progressione base deterministica.',goal:'creare un piccone',action:'craft',args:{name:'pickaxe',count:1},expected:'piccone nell inventario'};if(/chest|cassa|baule|contenitore/.test(text)&&!has('chest'))return{thought:'Progressione base deterministica.',goal:'creare una chest',action:'craft',args:{name:'chest',count:1},expected:'chest nell inventario'};return null}

export async function execute(bot, decision, { allowPvp = false, onStorageSeen, onAttackTarget, onShareCheckpoint } = {}) {
  decision=normalizeDecision(bot,decision);const a = decision.args || {}
  switch (decision.action) {
    case 'wait': await sleep(Math.min(Number(a.ms) || 1000, 10000)); return 'waited'
    case 'chat': bot.chat(String(a.message || '').slice(0, 200)); return 'sent chat'
    case 'stop': return 'agent requested stop'
    case 'unstuck': {
      bot.pathfinder?.setGoal(null);bot.clearControlStates?.()
      const yaw=(bot.entity.yaw||0)+(Math.random()>.5?1:-1)*(Math.PI/2+Math.random())
      await bot.look?.(yaw,0,true);bot.setControlState?.('jump',true);bot.setControlState?.('forward',true);if(Math.random()>.5)bot.setControlState?.('sprint',true)
      await sleep(1800);bot.clearControlStates?.();return 'manovra di sblocco completata'
    }
    case 'escape_hazard': {
      bot.pathfinder?.setGoal(null); bot.clearControlStates?.()
      const p=bot.entity.position.floored ? bot.entity.position.floored() : bot.entity.position
      const candidates=[]
      for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[2,0],[-2,0],[0,2],[0,-2]]){
        const floor=bot.blockAt(new Vec3(p.x+dx,p.y-1,p.z+dz)), feet=bot.blockAt(new Vec3(p.x+dx,p.y,p.z+dz)), head=bot.blockAt(new Vec3(p.x+dx,p.y+1,p.z+dz))
        if(floor?.boundingBox==='block'&&feet&&head&&/^(air|cave_air|void_air)$/.test(feet.name)&&/^(air|cave_air|void_air)$/.test(head.name)&&!/(lava|water)/.test(floor.name))candidates.push({x:p.x+dx,y:p.y,z:p.z+dz,d:Math.abs(dx)+Math.abs(dz)})
      }
      candidates.sort((a,b)=>b.d-a.d)
      if(!candidates.length)throw new Error('nessuna casella sicura trovata vicino al pericolo')
      await bot.pathfinder.goto(new goals.GoalNear(candidates[0].x,candidates[0].y,candidates[0].z,1)); return `pericolo evitato verso ${candidates[0].x},${candidates[0].y},${candidates[0].z}`
    }
    case 'move_to': {
      const x = Number(a.x), y = Number(a.y), z = Number(a.z)
      if (![x, y, z].every(Number.isFinite)) throw new Error('move_to needs numeric x, y, z')
      await bot.pathfinder.goto(new goals.GoalNear(x, y, z, Math.max(1, Number(a.range) || 2)))
      return `moved near ${x},${y},${z}`
    }
    case 'explore': {
      const radius=Math.max(8,Math.min(Number(a.radius)||18,40)),angle=Math.random()*Math.PI*2,p=bot.entity.position
      const x=Math.floor(p.x+Math.cos(angle)*radius),z=Math.floor(p.z+Math.sin(angle)*radius)
      await bot.pathfinder.goto(new goals.GoalXZ(x,z));return `esplorata la zona verso ${x},${z}`
    }
    case 'follow_player': {
      const username = String(a.username || '')
      const player = bot.players[username]?.entity
      if (!player) throw new Error(`player not visible: ${username}`)
      await bot.pathfinder.goto(new goals.GoalFollow(player, Math.max(2, Number(a.range) || 3)))
      return `followed ${username}`
    }
    case 'give_item': {
      const username = String(a.username || ''), player = bot.players[username]?.entity
      if (!player) throw new Error(`player not visible: ${username}`)
      const item = bot.inventory.items().find(i => i.name === String(a.name || ''))
      if (!item) throw new Error(`item not in inventory: ${a.name}`)
      await bot.pathfinder.goto(new goals.GoalNear(player.position.x, player.position.y, player.position.z, 2))
      const count = Math.max(1, Math.min(Number(a.count) || 1, item.count))
      await bot.toss(item.type, item.metadata, count)
      return `gave ${count} ${item.name} to ${username}`
    }
    case 'share_checkpoint': {
      const p=bot.entity.position,checkpoint=await onShareCheckpoint?.({type:String(a.type||'other'),label:String(a.label||a.type||'checkpoint'),x:Number.isFinite(Number(a.x))?Number(a.x):p.x,y:Number.isFinite(Number(a.y))?Number(a.y):p.y,z:Number.isFinite(Number(a.z))?Number(a.z):p.z,dimension:bot.game?.dimension,note:String(a.note||''),source:'agent'})
      if(!checkpoint)throw new Error('memoria checkpoint di squadra non disponibile')
      return `checkpoint condiviso: ${checkpoint.label} a ${checkpoint.x},${checkpoint.y},${checkpoint.z}`
    }
    case 'collect_block': {
      const name = String(a.name || '')
      if (!name) throw new Error('collect_block richiede il nome del blocco')
      const count=Math.max(1,Math.min(Number(a.count)||1,16)),distance=Math.min(Number(a.maxDistance)||48,64),before=inventoryTotal(bot);let broken=0
      for(let i=0;i<count;i++){const block=bot.findBlock({matching:b=>b?.name===name,maxDistance:distance});if(!block)break;await bot.collectBlock.collect(block);broken++;await collectNearbyDrops(bot,16)}
      const gained=inventoryTotal(bot)-before;if(!broken)throw new Error(`nessun blocco ${name} visibile e raggiungibile`);if(bot.inventory?.items&&gained<=0)throw new Error(`${broken} blocchi ${name} rotti, ma nessun materiale è entrato nell’inventario`)
      return `raccolti ${gained||broken} oggetti da ${name}`
    }
    case 'collect_wood': {
      const wanted=Math.max(1,Math.min(Number(a.count)||4,16)),before=inventoryTotal(bot,x=>/(_log|_wood|_stem|_hyphae)$/.test(x.name)),species=[]
      for(let i=0;i<wanted;i++){let positions=await findWoodWithExploration(bot,48);if(!positions.length){await sleep(1000);positions=await findWoodWithExploration(bot,96)}if(!positions.length)break;const minY=bot.entity.position.y-12,blocks=positions.map(p=>bot.blockAt(p)).filter(x=>isWood(x)&&x.position.y>=minY).sort((x,y)=>x.position.distanceTo(bot.entity.position)-y.position.distanceTo(bot.entity.position)||x.position.y-y.position.y),block=blocks[0];if(!block)break;try{await bot.collectBlock.collect(block)}catch{try{await bot.pathfinder.goto(new goals.GoalNear(block.position.x,block.position.y,block.position.z,2));await bot.dig(block)}catch{}}species.push(block.name);await collectNearbyDrops(bot,24);await sleep(500);if(inventoryTotal(bot,x=>/(_log|_wood|_stem|_hyphae)$/.test(x.name))-before>=wanted)break}
      const gained=inventoryTotal(bot,x=>/(_log|_wood|_stem|_hyphae)$/.test(x.name))-before;if(gained<=0)throw new Error('nessun albero raggiungibile entro 96 blocchi: esplora una nuova zona o verifica il bioma')
      return `raccolti ${gained} blocchi di legno (${[...new Set(species)].join(', ')})`
    }
    case 'collect_drops': {
      const limit = Math.min(Math.max(Number(a.maxDistance) || 24, 4), 48)
      const drops = Object.values(bot.entities).filter(e => e.name === 'item' && e.position?.distanceTo(bot.entity.position) <= limit).sort((x,y) => x.position.distanceTo(bot.entity.position) - y.position.distanceTo(bot.entity.position))
      if (!drops.length) throw new Error('nessun oggetto caduto visibile')
      let collected = 0
      for (const drop of drops.slice(0, 12)) { await bot.pathfinder.goto(new goals.GoalNear(drop.position.x, drop.position.y, drop.position.z, 1)); collected++ }
      return `raccolti ${collected} gruppi di oggetti caduti`
    }
    case 'inspect_storage': {
      const block=bot.findBlock({matching:b=>/^(chest|trapped_chest|barrel)$/.test(b?.name||''),maxDistance:48})
      if(!block)throw new Error('nessuna chest o barrel visibile')
      await bot.pathfinder.goto(new goals.GoalNear(block.position.x,block.position.y,block.position.z,3))
      const container=await bot.openContainer(block);const contents=container.containerItems().map(i=>({name:i.name,count:i.count}));container.close();await onStorageSeen?.(block.position,contents,block.name)
      return `ispezionato ${block.name} a ${block.position.x},${block.position.y},${block.position.z}: ${contents.map(x=>`${x.name} x${x.count}`).join(', ')||'vuoto'}`
    }
    case 'craft': {
      return craftItem(bot, String(a.name || ''), a.count)
    }
    case 'equip': {
      const item = bot.inventory.items().find(i => i.name === String(a.name || ''))
      if (!item) throw new Error(`item not in inventory: ${a.name}`)
      await bot.equip(item, a.destination || 'hand'); return `equipped ${item.name}`
    }
    case 'eat': {
      const food = bot.inventory.items().find(i => i.name === a.name) || bot.inventory.items().find(i => /bread|apple|beef|porkchop|chicken|mutton|carrot|potato|melon/.test(i.name))
      if (!food) throw new Error('no recognized food')
      await bot.equip(food, 'hand'); await bot.consume(); return `ate ${food.name}`
    }
    case 'build_shelter': {
      const blocks = bot.inventory.items().filter(i => /^(dirt|cobblestone|stone|deepslate|.*_planks)$/.test(i.name) && i.count > 0)
      if (!blocks.length) throw new Error('nessun blocco adatto per costruire un riparo')
      const material = blocks.sort((a, b) => b.count - a.count)[0]; await bot.equip(material, 'hand')
      const p = bot.entity.position.floored ? bot.entity.position.floored() : bot.entity.position; let placed = 0
      for (const [dx, dy, dz] of [[-1,0,-1],[0,0,-1],[1,0,-1],[-1,0,0],[1,0,0],[-1,0,1],[0,0,1],[1,0,1],[-1,1,-1],[1,1,-1],[-1,1,1],[1,1,1],[0,2,0]]) {
        if (material.count <= 0) break
        const target = bot.blockAt(new Vec3(p.x + dx, p.y + dy, p.z + dz)), below = bot.blockAt(new Vec3(p.x + dx, p.y + dy - 1, p.z + dz))
        if (!target || !below || below.boundingBox !== 'block' || !/^(air|cave_air|void_air)$/.test(target.name)) continue
        try { await bot.placeBlock(below, new Vec3(0, 1, 0)); placed++; material.count-- } catch {}
      }
      if (!placed) throw new Error('nessun blocco posizionato: spazio non valido o blocchi non raggiungibili')
      await onShareCheckpoint?.({type:'base',label:'Riparo costruito',x:p.x,y:p.y,z:p.z,note:`${placed} blocchi posizionati`,source:'shelter'})
      return `riparo costruito: ${placed} blocchi posizionati`
    }
    case 'attack_nearest': {
      const target = bot.nearestEntity(e => e.position.distanceTo(bot.entity.position) < 16 && (e.type === 'mob' || (allowPvp && e.type === 'player' && e.username !== bot.username)))
      if (!target) throw new Error('no allowed nearby target')
      const movement = new Movements(bot); movement.canDig = false; bot.pathfinder.setMovements(movement)
      await bot.pathfinder.goto(new goals.GoalNear(target.position.x, target.position.y, target.position.z, 2))
      onAttackTarget?.(target); bot.attack(target); return `attacked ${target.name || target.username}`
    }
    default: throw new Error(`unsupported action ${decision.action}`)
  }
}
export function autonomousProgressionDecision(bot, observation = {}, checkpoints = []) {
  const items=bot.inventory?.items?.()||[], has=name=>items.some(x=>x.name===name&&x.count>0), food=items.find(x=>/bread|apple|beef|porkchop|chicken|mutton|carrot|potato|melon/.test(x.name)), logs=items.reduce((n,x)=>n+(/(_log|_wood|_stem|_hyphae)$/.test(x.name)?x.count:0),0), planks=items.reduce((n,x)=>n+(/_planks$/.test(x.name)?x.count:0),0), table=has('crafting_table')||!!bot.findBlock?.({matching:bot.registry?.blocksByName?.crafting_table?.id,maxDistance:6}), sheltered=checkpoints.some(x=>x.type==='base'||/riparo|base|shelter/i.test(x.label||''))
  if(Number(observation.food)<8&&food)return{thought:'Priorità survival: fame bassa.',goal:'mangiare per sopravvivere',action:'eat',args:{name:food.name},expected:'fame sopra la soglia'}
  if(Number(observation.health)>0&&Number(observation.health)<8&&food)return{thought:'Priorità survival: salute critica.',goal:'mangiare e cercare sicurezza',action:'eat',args:{name:food.name},expected:'salute stabilizzata'}
  if(logs<2&&planks<4)return{thought:'Progressione automatica: servono materiali primari.',goal:'raccogliere legno',action:'collect_wood',args:{count:4},expected:'legno nell inventario'}
  if(!table&& (logs>0||planks>=4))return{thought:'Progressione automatica: banco da lavoro mancante.',goal:'creare e posizionare un banco',action:'craft',args:{name:'crafting_table',count:1},expected:'banco disponibile'}
  if(table&&!items.some(x=>/_pickaxe$/.test(x.name)))return{thought:'Progressione automatica: utensile base mancante.',goal:'creare un piccone',action:'craft',args:{name:'pickaxe',count:1},expected:'piccone nell inventario'}
  if(!sheltered&&items.some(x=>/^(dirt|cobblestone|stone|deepslate|.*_planks)$/.test(x.name)))return{thought:'Progressione automatica: nessun riparo registrato.',goal:'costruire un riparo sicuro',action:'build_shelter',args:{},expected:'riparo costruito'}
  return null
}
