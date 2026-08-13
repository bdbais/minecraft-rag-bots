import pathfinderPackage from 'mineflayer-pathfinder'
import { Vec3 } from 'vec3'

const { goals, Movements } = pathfinderPackage

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const names = ['wait', 'chat', 'unstuck', 'escape_hazard', 'dig_escape', 'vertical_escape', 'move_to', 'explore', 'navigate_boat', 'follow_player', 'give_item', 'share_checkpoint', 'collect_wood', 'collect_block', 'collect_drops', 'collect_fluid', 'cool_lava', 'harvest_crops', 'plant_crops', 'prepare_farm', 'inspect_storage', 'store_items', 'read_sign', 'write_sign', 'craft', 'smelt', 'sleep', 'equip', 'eat', 'fish', 'build_shelter', 'build_door', 'build_pen', 'build_redstone_defense', 'breed_animals', 'build_memorial', 'hunt_nearest', 'attack_nearest', 'stop']
const isWood = block => /(_log|_wood|_stem|_hyphae)$/.test(block?.name || '')

const itemCount = (bot, id, metadata = null) => bot.inventory.count(id, metadata)
const inventoryTotal=(bot,filter=()=>true)=>(bot.inventory?.items?.()||[]).filter(filter).reduce((n,x)=>n+(x.count||0),0)
export function checkpointDistanceFrom(origin, checkpoint) { return origin ? Math.hypot(Number(checkpoint.x)-origin.x, Number(checkpoint.z)-origin.z) : Number.isFinite(Number(checkpoint.distance)) ? Number(checkpoint.distance) : 999 }
const protectedBlock=/^(crafting_table|furnace|chest|barrel|bed|.*_bed|door|.*_door|farmland|.*_crop|water|lava)$/i
export function simulateLavaDefense(bot, origin, {maxCells=24, minDistance=4}={}) {
  const start=new Vec3(Math.floor(origin.x),Math.floor(origin.y),Math.floor(origin.z)), queue=[start], seen=new Set(), cells=[], unsafe=[]
  while(queue.length&&cells.length<maxCells){const p=queue.shift(),key=`${p.x},${p.y},${p.z}`;if(seen.has(key))continue;seen.add(key);const b=bot.blockAt?.(p),name=b?.name||'';if(!b||protectedBlock.test(name)||(p!==start&&p.distanceTo(start)<minDistance)){unsafe.push({x:p.x,y:p.y,z:p.z,reason:protectedBlock.test(name)?name:'too_near'});continue}cells.push({x:p.x,y:p.y,z:p.z});for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]])queue.push(new Vec3(p.x+dx,p.y,p.z+dz))}
  return {safe:unsafe.length===0&&cells.length>0,cells,unsafe,reason:unsafe.length?'il flusso raggiunge una zona protetta o troppo vicina':'percorso del flusso confinato'}
}
async function compactInventory(bot){const slots=bot.inventory?.slots||[],byKey=new Map();for(let i=0;i<slots.length;i++){const item=slots[i];if(!item)continue;let nbt='';try{nbt=item.nbt?JSON.stringify(item.nbt):''}catch{}const key=`${item.type}:${item.metadata||0}:${nbt}`;const previous=byKey.get(key);if(previous!=null&&typeof bot.moveSlotItem==='function'){try{await bot.moveSlotItem(i,previous)}catch{}}else byKey.set(key,i)}}
async function equipToolForBlock(bot, blockName){
  if(typeof bot.equip!=='function')return null
  const name=String(blockName||''),kind=/_log$|_wood$|_stem$|_hyphae$/.test(name)?'axe':/dirt|sand|gravel|clay|soul_soil|snow/.test(name)?'shovel':/crop|wheat|carrot|potato|beetroot/.test(name)?'hoe':/stone|deepslate|ore|cobble|obsidian|netherrack|blackstone/.test(name)?'pickaxe':null
  if(!kind)return null
  const tier={wooden:1,stone:2,iron:3,diamond:4,netherite:5},items=bot.inventory?.items?.()||[],tool=items.filter(i=>new RegExp(`_${kind}$`).test(i.name)&&i.count>0).sort((a,b)=>(tier[String(b.name).split('_')[0]]||0)-(tier[String(a.name).split('_')[0]]||0))[0]
  if(tool){await bot.equip(tool,'hand');return tool.name}
  return null
}
async function collectOrDigBlock(bot, block){
  if(bot.collectBlock?.collect)return bot.collectBlock.collect(block)
  if(!bot.pathfinder?.goto||typeof bot.dig!=='function')throw new Error('raccolta blocchi non disponibile: manca collectBlock e dig')
  await bot.pathfinder.goto(new goals.GoalNear(block.position.x,block.position.y,block.position.z,2))
  await bot.dig(block)
}
async function collectNearbyDrops(bot,maxDistance=16){
  await sleep(700)
  const drops=Object.values(bot.entities||{}).filter(e=>e.name==='item'&&e.position?.distanceTo(bot.entity.position)<=maxDistance).sort((a,b)=>a.position.distanceTo(bot.entity.position)-b.position.distanceTo(bot.entity.position))
  let picked=0
  for(const drop of drops.slice(0,20)){
    try{
      await bot.pathfinder.goto(new goals.GoalNear(drop.position.x,drop.position.y,drop.position.z,1))
      // Mineflayer picks items up asynchronously. A second, tighter approach
      // avoids reporting success while the entity is still on the ground.
      await sleep(500)
      if(Object.values(bot.entities||{}).includes(drop)){
        await bot.pathfinder.goto(new goals.GoalNear(drop.position.x,drop.position.y,drop.position.z,0.35)).catch(()=>{})
        await sleep(500)
      }
      if(!Object.values(bot.entities||{}).includes(drop))picked++
    }catch{}
  }
  await sleep(400)
  return picked
}
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
  const beforeCraft=typeof bot.inventory?.count==='function'?itemCount(bot,item.id,null):null
  await bot.craft(recipe, crafts, table)
  if(beforeCraft!==null&&itemCount(bot,item.id,null)<=beforeCraft)throw new Error(`crafting di ${name} completato dal client ma risultato non verificato nell’inventario`)
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

export async function execute(bot, decision, { allowPvp = false, onStorageSeen, onAttackTarget, onShareCheckpoint, onSocial, config } = {}) {
  decision=normalizeDecision(bot,decision);const a = decision.args || {}
  if(['collect_block','collect_fluid','cool_lava','harvest_crops','plant_crops','inspect_storage','store_items','craft','smelt','fish','hunt_nearest'].includes(decision.action))await compactInventory(bot)
  switch (decision.action) {
    case 'wait': await sleep(Math.min(Number(a.ms) || 1000, 10000)); return 'waited'
    case 'chat': {
      // Il modello a volte restituisce "NomeBot: testo" come se stesse
      // scrivendo un transcript. In Minecraft il nome viene già aggiunto dal
      // server: rimuoverlo evita messaggi autoreferenziali e conversazioni
      // apparentemente con se stessi.
      let message=String(a.message||'').replace(/\s+/g,' ').trim()
      const names=[bot.username,config?.name].filter(Boolean).map(x=>String(x).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')
      if(names)message=message.replace(new RegExp(`^(?:${names})\\s*[:：-]\\s*`,'i'),'')
      if(!message)return 'chat vuota ignorata'
      bot.chat(message.slice(0,200)); return 'sent chat'
    }
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
      if(!candidates.length){try{return await execute(bot,{action:'dig_escape',goal:'aprire un passaggio di fuga verificato',args:{}},{allowPvp,onStorageSeen,onAttackTarget,onShareCheckpoint})}catch(error){throw new Error(`${error.message}; il bot è ancora dentro acqua o lava`)}}
      if(bot.registry?.blocksByName){const movement=new Movements(bot);movement.canDig=false;movement.blocksToAvoid=new Set([bot.registry?.blocksByName?.water?.id,bot.registry?.blocksByName?.lava?.id].filter(Number.isInteger));bot.pathfinder.setMovements(movement)}
      await bot.pathfinder.goto(new goals.GoalNear(candidates[0].x,candidates[0].y,candidates[0].z,1)); const after=bot.entity.position.floored(),afterFeet=bot.blockAt(after),afterHead=bot.blockAt(new Vec3(after.x,after.y+1,after.z)); if(/lava|water/.test(`${afterFeet?.name||''} ${afterHead?.name||''}`))throw new Error('il bot è ancora dentro acqua o lava dopo la fuga'); return `pericolo evitato verso ${candidates[0].x},${candidates[0].y},${candidates[0].z}`
    }
    case 'dig_escape': {
      bot.pathfinder?.setGoal(null);bot.clearControlStates?.();const pick=bot.inventory?.items?.().find(i=>/_pickaxe$/.test(i.name));if(pick)await bot.equip(pick,'hand');const p=bot.entity.position.floored(),dirs=[[1,0],[-1,0],[0,1],[0,-1]],safe=[]
      for(const [dx,dz] of dirs){const wall=bot.blockAt(new Vec3(p.x+dx,p.y,p.z+dz)),head=bot.blockAt(new Vec3(p.x+dx,p.y+1,p.z+dz)),beyond=bot.blockAt(new Vec3(p.x+dx*2,p.y,p.z+dz*2)),beyondHead=bot.blockAt(new Vec3(p.x+dx*2,p.y+1,p.z+dz*2));if(!wall||wall.boundingBox!=='block'||/lava|water/.test(wall.name)||/lava|water/.test(head?.name||'')||/bedrock|barrier|end_portal/.test(wall.name))continue;const openBeyond=(!beyond||/^(air|cave_air|void_air)$/.test(beyond.name))&&(!beyondHead||/^(air|cave_air|void_air)$/.test(beyondHead.name));safe.push([dx,dz,wall,head,openBeyond])}
      if(!safe.length)throw new Error('nessuna parete sicura da scavare: cercare aiuto')
      safe.sort((a,b)=>Number(b[4])-Number(a[4]));const [dx,dz,wall,head,openBeyond]=safe[0];await bot.dig(wall);if(head?.boundingBox==='block'&&!/lava|water/.test(head.name))await bot.dig(head);if(openBeyond)try{await bot.pathfinder.goto(new goals.GoalNear(p.x+dx*2,p.y,p.z+dz*2,1))}catch{}return `scavato un blocco di fuga verso ${p.x+dx},${p.y},${p.z+dz}${openBeyond?' e aperto il passaggio':''}`
    }
    case 'vertical_escape': {
      bot.pathfinder?.setGoal(null);bot.clearControlStates?.();const maxSteps=Math.max(1,Math.min(24,Number(a.maxSteps)||12)),support=(bot.inventory?.items?.()||[]).find(i=>/dirt|cobblestone|stone|netherrack|deepslate|sand|gravel|planks/.test(i.name)&&i.count>0);if(!support)throw new Error('nessun blocco comune per la colonna di fuga');await bot.equip(support,'hand');let climbed=0,dug=0;
      for(let step=0;step<maxSteps;step++){const p=bot.entity.position.floored(),below=bot.blockAt(new Vec3(p.x,p.y-1,p.z)),feet=bot.blockAt(p),head=bot.blockAt(new Vec3(p.x,p.y+1,p.z));if(/lava|water/.test(`${below?.name} ${feet?.name} ${head?.name}`))throw new Error('acqua o lava rilevata durante la fuga verticale');if(head?.boundingBox==='block'){await bot.dig(head);dug++;const nextHead=bot.blockAt(new Vec3(p.x,p.y+2,p.z));if(nextHead?.boundingBox==='block'){await bot.dig(nextHead);dug++}}else if(below?.boundingBox!=='block'){const anchor=bot.blockAt(new Vec3(p.x,p.y-2,p.z));if(!anchor||anchor.boundingBox!=='block')throw new Error('nessun punto di appoggio per la colonna');await bot.placeBlock(anchor,new Vec3(0,1,0));}bot.setControlState?.('jump',true);await sleep(650);bot.setControlState?.('jump',false);if(bot.entity.position.y>p.y)climbed++;if((bot.inventory?.items?.().find(i=>i.name===support.name)?.count||0)<=0)break}
      bot.clearControlStates?.();if(!climbed&&!dug)throw new Error('fuga verticale senza progresso');return `fuga verticale: ${climbed} salti, ${dug} blocchi scavati`
    }
    case 'move_to': {
      const x = Number(a.x), y = Number(a.y), z = Number(a.z)
      if (![x, y, z].every(Number.isFinite)) throw new Error('move_to needs numeric x, y, z')
      const range=Math.max(1, Number(a.range) || 2)
      await bot.pathfinder.goto(new goals.GoalNear(x, y, z, range))
      const distance=bot.entity?.position?.distanceTo(new Vec3(x,y,z))
      if(!Number.isFinite(distance) || distance>range+0.75) throw new Error(`percorso incompleto: distanza residua ${distance?.toFixed?.(1) ?? 'sconosciuta'} blocchi`)
      if(a.poi&&onShareCheckpoint)await onShareCheckpoint({type:'poi',label:String(a.poi),x,y,z,dimension:bot.game?.dimension,note:'raggiunto e verificato dal bot',source:'navigation'})
      return `raggiunta posizione ${x},${y},${z} (distanza ${distance.toFixed(1)})`
    }
    case 'explore': {
      const radius=Math.max(8,Math.min(Number(a.radius)||18,40)),angle=Math.random()*Math.PI*2,p=bot.entity.position
      const x=Math.floor(p.x+Math.cos(angle)*radius),z=Math.floor(p.z+Math.sin(angle)*radius)
      if(bot.registry?.blocksByName&&bot.pathfinder?.setMovements){const movement=new Movements(bot);movement.canDig=false;movement.blocksToAvoid=new Set([bot.registry.blocksByName.lava?.id,bot.registry.blocksByName.water?.id].filter(Number.isInteger));bot.pathfinder.setMovements(movement)}
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
      const before=item.count;await bot.toss(item.type, item.metadata, count);await sleep(250)
      const remaining=bot.inventory.items().filter(i=>i.name===item.name).reduce((sum,i)=>sum+(Number(i.count)||0),0);if(remaining>=before)throw new Error(`condivisione non verificata: ${item.name} è ancora intatto nell’inventario`)
      await onSocial?.(username,{karma:Math.min(1,count*0.05),good:true,memory:`ha condiviso ${count} ${item.name}`})
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
      const explicitDestroy = /distrugg|romp|demol|rimuov|break|destroy/i.test(`${decision.goal || ''} ${a.reason || ''}`)
      const protectedObject=/^(crafting_table|furnace|blast_furnace|smoker|chest|trapped_chest|barrel|anvil|smithing_table|grindstone|stonecutter|cartography_table|loom|enchanting_table|brewing_stand|door|.*_door|trapdoor|.*_trapdoor|fence_gate|.*_fence_gate|bed|.*_bed|sign|.*_sign|hanging_sign|.*_hanging_sign|ladder|scaffolding|torch|.*_torch|lantern|.*_lantern|lever|button|.*_button|pressure_plate|.*_pressure_plate|rail|.*_rail)$/.test(name)
      if (protectedObject && !explicitDestroy) throw new Error(`${name} è un oggetto/postazione protetta: serve un comando esplicito per distruggerla`)
      const count=Math.max(1,Math.min(Number(a.count)||1,16)),distance=Math.min(Number(a.maxDistance)||48,64),before=inventoryTotal(bot);let broken=0
      for(let i=0;i<count;i++){const block=bot.findBlock({matching:b=>b?.name===name,maxDistance:distance});if(!block)break;await equipToolForBlock(bot,name);await collectOrDigBlock(bot,block);broken++;await collectNearbyDrops(bot,16)}
      const gained=inventoryTotal(bot)-before;if(!broken)throw new Error(`nessun blocco ${name} visibile e raggiungibile`);if(bot.inventory?.items&&gained<=0)throw new Error(`${broken} blocchi ${name} rotti, ma nessun materiale è entrato nell’inventario`)
      return `raccolti ${gained||broken} oggetti da ${name}`
    }
    case 'collect_wood': {
      await compactInventory(bot)
      const wanted=Math.max(1,Math.min(Number(a.count)||4,16)),before=inventoryTotal(bot,x=>/(_log|_wood|_stem|_hyphae)$/.test(x.name)),species=[]
      for(let i=0;i<wanted;i++){let positions=await findWoodWithExploration(bot,48);if(!positions.length){await sleep(1000);positions=await findWoodWithExploration(bot,96)}if(!positions.length)break;const minY=bot.entity.position.y-12,blocks=positions.map(p=>bot.blockAt(p)).filter(x=>isWood(x)&&x.position.y>=minY).sort((x,y)=>x.position.distanceTo(bot.entity.position)-y.position.distanceTo(bot.entity.position)||x.position.y-y.position.y),block=blocks[0];if(!block)break;try{await equipToolForBlock(bot,block.name);await collectOrDigBlock(bot,block)}catch{try{await bot.pathfinder.goto(new goals.GoalNear(block.position.x,block.position.y,block.position.z,2));await equipToolForBlock(bot,block.name);await bot.dig(block)}catch{}}species.push(block.name);await collectNearbyDrops(bot,24);await sleep(500);if(inventoryTotal(bot,x=>/(_log|_wood|_stem|_hyphae)$/.test(x.name))-before>=wanted)break}
      const gained=inventoryTotal(bot,x=>/(_log|_wood|_stem|_hyphae)$/.test(x.name))-before;if(gained<=0)throw new Error('nessun albero raggiungibile entro 96 blocchi: esplora una nuova zona o verifica il bioma')
      return `raccolti ${gained} blocchi di legno (${[...new Set(species)].join(', ')})`
    }
    case 'collect_drops': {
      await compactInventory(bot)
      const limit = Math.min(Math.max(Number(a.maxDistance) || 24, 4), 48)
      const drops = Object.values(bot.entities).filter(e => e.name === 'item' && e.position?.distanceTo(bot.entity.position) <= limit).sort((x,y) => x.position.distanceTo(bot.entity.position) - y.position.distanceTo(bot.entity.position))
      if (!drops.length) throw new Error('nessun oggetto caduto visibile')
      const collected = await collectNearbyDrops(bot, limit)
      if (!collected) throw new Error('gli oggetti sono ancora a terra: avvicinamento o inventario non riuscito')
      return `raccolti ${collected} gruppi di oggetti caduti`
    }
    case 'collect_fluid': {
      const fluid=String(a.fluid||'water').toLowerCase();if(!/^(water|lava)$/.test(fluid))throw new Error('fluido non supportato: usare water o lava')
      if(typeof bot.activateBlock!=='function')throw new Error('il client non supporta la raccolta dei fluidi')
      const source=bot.findBlock({matching:b=>b?.name===fluid,maxDistance:Math.min(Number(a.maxDistance)||12,24)});if(!source)throw new Error(`nessuna sorgente di ${fluid} raggiungibile`)
      const bucket=bot.inventory.items().find(i=>i.name==='bucket'&&i.count>0);if(!bucket)throw new Error('serve un secchio vuoto')
      const before=bot.inventory.items().reduce((sum,i)=>sum+(i.name===`${fluid}_bucket`?i.count:0),0);await bot.pathfinder.goto(new goals.GoalNear(source.position.x,source.position.y,source.position.z,2));await bot.equip(bucket,'hand');await bot.activateBlock(source);await sleep(350)
      const after=bot.inventory.items().reduce((sum,i)=>sum+(i.name===`${fluid}_bucket`?i.count:0),0);if(after<=before)throw new Error(`raccolta di ${fluid} non verificata nell'inventario`)
      return `raccolta verificata: ${fluid} nel secchio`
    }
    case 'cool_lava': {
      if(typeof bot.activateBlock!=='function')throw new Error('il client non supporta l’interazione con i fluidi')
      const lava=bot.findBlock({matching:b=>b?.name==='lava'&&(!Number.isFinite(Number(b.metadata))||Number(b.metadata)===0)&&(!b.getProperties||Number(b.getProperties()?.level||0)===0),maxDistance:Math.min(Number(a.maxDistance)||12,24)})
      if(!lava)throw new Error('nessuna sorgente di lava raggiungibile per creare ossidiana')
      const water=bot.inventory.items().find(i=>i.name==='water_bucket'&&i.count>0)
      if(!water)throw new Error('serve un secchio d’acqua per raffreddare la lava')
      await bot.pathfinder.goto(new goals.GoalNear(lava.position.x,lava.position.y,lava.position.z,2));await bot.equip(water,'hand');await bot.activateBlock(lava);await sleep(450)
      const cooled=bot.blockAt(lava.position)
      if(!cooled||!/^(obsidian|cobblestone|stone)$/.test(cooled.name))throw new Error(`raffreddamento non verificato: la lava è ancora ${cooled?.name||'sconosciuta'}`)
      return `lava raffreddata: ottenuto ${cooled.name==='obsidian'?'ossidiana':cooled.name}`
    }
    case 'harvest_crops': {
      const cropNames=/^(wheat|carrots|potatoes|beetroots|nether_wart|sweet_berry_bush)$/
      const crops=typeof bot.findBlocks==='function'
        ? bot.findBlocks({matching:b=>cropNames.test(b?.name||'')&&((b?.getProperties?.().age??b?.metadata??7)>=7),maxDistance:Math.min(Number(a.maxDistance)||16,32),count:Math.min(Number(a.count)||4,8)}).map(p=>bot.blockAt(p)).filter(Boolean)
        : []
      if(!crops.length)throw new Error('nessuna coltura matura raggiungibile')
      const before=bot.inventory.items().reduce((sum,i)=>sum+(Number(i.count)||0),0);let harvested=0
      for(const crop of crops){try{await bot.pathfinder.goto(new goals.GoalNear(crop.position.x,crop.position.y,crop.position.z,2));await bot.dig(crop);harvested++;const seedName=crop.name==='wheat'?'wheat_seeds':crop.name==='beetroots'?'beetroot_seeds':crop.name==='carrots'?'carrot':crop.name==='potatoes'?'potato':null;const seed=seedName&&bot.inventory.items().find(i=>i.name===seedName&&i.count>0);const soil=seed&&bot.blockAt(new Vec3(crop.position.x,crop.position.y-1,crop.position.z));if(seed&&soil?.name==='farmland'&&typeof bot.equip==='function'&&typeof bot.placeBlock==='function'){try{await bot.equip(seed,'hand');await bot.placeBlock(soil,new Vec3(0,1,0))}catch{}}}catch{}}
      await sleep(450);const after=bot.inventory.items().reduce((sum,i)=>sum+(Number(i.count)||0),0);if(!harvested||after<=before)throw new Error('raccolta colture non verificata nell’inventario')
      return `raccolte ${harvested} colture mature`
    }
    case 'plant_crops': {
      const seeds=(bot.inventory?.items?.()||[]).find(i=>/^(wheat_seeds|beetroot_seeds|carrot|potato|melon_seeds|pumpkin_seeds)$/.test(i.name)&&i.count>0)
      if(!seeds)throw new Error('nessun seme disponibile per avviare la coltura')
      const crop=seeds.name==='wheat_seeds'?'wheat':seeds.name==='beetroot_seeds'?'beetroots':seeds.name==='carrot'?'carrots':seeds.name==='potato'?'potatoes':seeds.name==='melon_seeds'?'melon_stem':'pumpkin_stem'
      const soils=typeof bot.findBlocks==='function'?bot.findBlocks({matching:b=>b?.name==='farmland',maxDistance:Math.min(Number(a.maxDistance)||24,40),count:Math.min(Number(a.count)||4,8)}):[]
      if(!soils.length)throw new Error('nessun terreno arato raggiungibile per piantare')
      const before=seeds.count;let planted=0
      await bot.equip(seeds,'hand')
      for(const pos of soils){const target=bot.blockAt(new Vec3(pos.x,pos.y+1,pos.z));if(!target||!/^(air|cave_air|void_air)$/.test(target.name))continue;try{await bot.placeBlock(bot.blockAt(pos),new Vec3(0,1,0));const placed=bot.blockAt(new Vec3(pos.x,pos.y+1,pos.z));if(placed&&placed.name===crop)planted++}catch{}}
      const after=(bot.inventory?.items?.()||[]).filter(i=>i.name===seeds.name).reduce((n,i)=>n+(Number(i.count)||0),0)
      if(!planted||after>=before)throw new Error('semina non verificata nel mondo o nell’inventario')
      return `piantate ${planted} colture di ${crop}`
    }
    case 'prepare_farm': {
      if(typeof bot.activateBlock!=='function')throw new Error('il client non supporta la preparazione del terreno')
      const water=bot.findBlock({matching:b=>b?.name==='water',maxDistance:Math.min(Number(a.maxDistance)||16,32)})
      if(!water)throw new Error('serve acqua vicina per irrigare il campo')
      const soil=bot.findBlock({matching:b=>/^(dirt|grass_block)$/.test(b?.name||''),maxDistance:Math.min(Number(a.maxDistance)||16,32)})
      if(!soil)throw new Error('nessun blocco di terra raggiungibile per arare')
      let hoe=bot.inventory.items().find(i=>/_hoe$/.test(i.name)&&i.count>0)
      if(!hoe){await craftItem(bot,'hoe',1,0);hoe=bot.inventory.items().find(i=>/_hoe$/.test(i.name)&&i.count>0)}
      if(!hoe)throw new Error('nessuna zappa disponibile per arare')
      await bot.pathfinder.goto(new goals.GoalNear(soil.position.x,soil.position.y,soil.position.z,2));await bot.equip(hoe,'hand');await bot.activateBlock(soil);await sleep(400)
      const farmland=bot.blockAt(soil.position);if(!farmland||farmland.name!=='farmland')throw new Error('aratura non verificata: il blocco non è diventato farmland')
      return `campo preparato vicino all’acqua a ${soil.position.x},${soil.position.y},${soil.position.z}`
    }
    case 'inspect_storage': {
      const block=bot.findBlock({matching:b=>/^(chest|trapped_chest|barrel)$/.test(b?.name||''),maxDistance:48})
      if(!block)throw new Error('nessuna chest o barrel visibile')
      await bot.pathfinder.goto(new goals.GoalNear(block.position.x,block.position.y,block.position.z,3))
      const container=await bot.openContainer(block);const contents=container.containerItems().map(i=>({name:i.name,count:i.count}));container.close();await onStorageSeen?.(block.position,contents,block.name)
      return `ispezionato ${block.name} a ${block.position.x},${block.position.y},${block.position.z}: ${contents.map(x=>`${x.name} x${x.count}`).join(', ')||'vuoto'}`
    }
    case 'store_items': {
      let block=bot.findBlock({matching:b=>/^(chest|trapped_chest|barrel)$/.test(b?.name||''),maxDistance:Math.min(Number(a.maxDistance)||32,48)})
      if(!block){
        let chest=bot.inventory.items().find(i=>i.name==='chest')
        if(!chest){await craftItem(bot,'chest',1,0);chest=bot.inventory.items().find(i=>i.name==='chest')}
        if(!chest)throw new Error('nessuna chest disponibile e impossibile craftarla')
        await bot.equip(chest,'hand');const p=bot.entity.position.floored()
        for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const base=bot.blockAt(new Vec3(p.x+dx,p.y-1,p.z+dz)),air=bot.blockAt(new Vec3(p.x+dx,p.y,p.z+dz));if(!base||base.boundingBox!=='block'||!air||!/^(air|cave_air|void_air)$/.test(air.name))continue;try{await bot.placeBlock(base,new Vec3(0,1,0));block=bot.blockAt(new Vec3(p.x+dx,p.y,p.z+dz));if(block)break}catch{}}
      }
      if(!block)throw new Error('nessun punto sicuro per posizionare una chest')
      await bot.pathfinder.goto(new goals.GoalNear(block.position.x,block.position.y,block.position.z,3))
      const container=await bot.openContainer(block);let deposited=0
      const keep=name=>/(_axe|_pickaxe|_shovel|_sword|_hoe|shield|bow|crossbow|helmet|chestplate|leggings|boots|food|bread|apple|bucket|torch|crafting_table)$/.test(name)
      for(const item of [...(bot.inventory.items?.()||[])]){
        if(/^(chest|trapped_chest|barrel)$/.test(item.name)||keep(item.name))continue
        try{await container.deposit(item.type,item.metadata,item.count);deposited+=item.count}catch{}
      }
      const contents=container.containerItems().map(i=>({name:i.name,count:i.count}));container.close();await onStorageSeen?.(block.position,contents,block.name);await onShareCheckpoint?.({type:'chest',label:'Deposito materiali',x:block.position.x,y:block.position.y,z:block.position.z,note:`${deposited} oggetti depositati`,source:'storage'})
      if(!deposited)throw new Error('nessun oggetto utile da depositare nella chest')
      return `depositati ${deposited} oggetti in ${block.name}`
    }
    case 'read_sign': {
      const sign=bot.findBlock({matching:b=>/^(oak|spruce|birch|jungle|acacia|dark_oak|mangrove|cherry|bamboo|crimson|warped)_sign$/.test(b?.name||''),maxDistance:Math.min(Number(a.maxDistance)||24,48)})
      if(!sign)throw new Error('nessun cartello visibile')
      await bot.pathfinder.goto(new goals.GoalNear(sign.position.x,sign.position.y,sign.position.z,3));const data=bot.blockAt(sign.position),lines=(data?.signText||data?.text||[]).map?.(x=>typeof x==='string'?x:(x?.text||''))||[];const text=lines.join(' ').trim()||'cartello vuoto';return `letto cartello a ${sign.position.x},${sign.position.y},${sign.position.z}: ${text}`
    }
    case 'write_sign': {
      if(typeof bot.updateSign!=='function')throw new Error('questa versione del server non supporta la scrittura dei cartelli')
      let sign=bot.findBlock({matching:b=>/^(oak|spruce|birch|jungle|acacia|dark_oak|mangrove|cherry|bamboo|crimson|warped)_sign$/.test(b?.name||''),maxDistance:Math.min(Number(a.maxDistance)||24,48)})
      const lines=(Array.isArray(a.lines)?a.lines.map(String):String(a.text||'').split(/\n/)).slice(0,4)
      if(!sign){let item=bot.inventory.items().find(i=>/_sign$/.test(i.name));if(!item){try{await craftItem(bot,'sign',1,0);item=bot.inventory.items().find(i=>/_sign$/.test(i.name))}catch{}}if(!item)throw new Error('nessun cartello disponibile e impossibile craftarlo');const p=bot.entity.position.floored();await bot.equip(item,'hand');for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const base=bot.blockAt(new Vec3(p.x+dx,p.y-1,p.z+dz)),air=bot.blockAt(new Vec3(p.x+dx,p.y,p.z+dz));if(!base||base.boundingBox!=='block'||!air||!/^(air|cave_air|void_air)$/.test(air.name))continue;try{await bot.placeBlock(base,new Vec3(0,1,0));sign=bot.blockAt(new Vec3(p.x+dx,p.y,p.z+dz));if(sign)break}catch{}}}
      if(!sign)throw new Error('nessun punto sicuro per posizionare il cartello');await bot.pathfinder.goto(new goals.GoalNear(sign.position.x,sign.position.y,sign.position.z,3));await bot.updateSign(sign,lines);return `cartello aggiornato a ${sign.position.x},${sign.position.y},${sign.position.z}`
    }
    case 'build_pen': {
      let material=bot.inventory.items().find(i=>/_fence$/.test(i.name)&&i.count>=8)
      if(!material){try{await craftItem(bot,'fence',8,0);material=bot.inventory.items().find(i=>/_fence$/.test(i.name)&&i.count>=8)}catch{}}
      material=material||bot.inventory.items().find(i=>/(_fence|cobblestone|stone|dirt|planks)$/.test(i.name)&&i.count>=8)
      if(!material)throw new Error('servono almeno 8 blocchi per costruire un recinto')
      await bot.equip(material,'hand');const p=bot.entity.position.floored();let placed=0;const positions=[]
      for(const [dx,dz] of [[-2,-2],[-1,-2],[0,-2],[1,-2],[2,-2],[-2,-1],[2,-1],[-2,0],[2,0],[-2,1],[2,1],[-2,2],[-1,2],[0,2],[1,2],[2,2]]){const below=bot.blockAt(new Vec3(p.x+dx,p.y-1,p.z+dz)),target=bot.blockAt(new Vec3(p.x+dx,p.y,p.z+dz));if(!below||below.boundingBox!=='block'||!target||!/^(air|cave_air|void_air)$/.test(target.name))continue;try{await bot.placeBlock(below,new Vec3(0,1,0));positions.push(new Vec3(p.x+dx,p.y,p.z+dz));placed++}catch{}}
      if(placed<4)throw new Error('recinto non costruibile nello spazio disponibile')
      if(typeof bot.blockAt==='function'){const verified=positions.filter(pos=>{const block=bot.blockAt(pos);return block&&block.name&&!/^(air|cave_air|void_air)$/.test(block.name)});if(verified.length<4)throw new Error('recinto non verificato dopo il posizionamento')}
      await onShareCheckpoint?.({type:'pen',label:'Recinto allevamento',x:p.x,y:p.y,z:p.z,note:`${placed} elementi verificati`,source:'husbandry'})
      return `recinto costruito: ${placed} elementi`
    }
    case 'build_redstone_defense': {
      const torch=bot.inventory.items().find(i=>i.name==='redstone_torch'),trigger=bot.inventory.items().find(i=>/^(lever|stone_pressure_plate|oak_pressure_plate|spruce_pressure_plate|birch_pressure_plate)$/.test(i.name))
      if(!torch||!trigger)throw new Error('servono una torcia redstone e un comando per la difesa')
      const p=bot.entity.position.floored(),placements=[];await bot.equip(torch,'hand')
      for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const base=bot.blockAt(new Vec3(p.x+dx,p.y-1,p.z+dz)),target=bot.blockAt(new Vec3(p.x+dx,p.y,p.z+dz));if(!base||base.boundingBox!=='block'||!target||!/^(air|cave_air|void_air)$/.test(target.name))continue;try{await bot.placeBlock(base,new Vec3(0,1,0));placements.push({name:'redstone_torch',x:p.x+dx,y:p.y,z:p.z+dz});break}catch{}}
      await bot.equip(trigger,'hand');for(const [dx,dz] of [[-1,0],[0,1],[0,-1],[1,0]]){const base=bot.blockAt(new Vec3(p.x+dx,p.y-1,p.z+dz)),target=bot.blockAt(new Vec3(p.x+dx,p.y,p.z+dz));if(!base||base.boundingBox!=='block'||!target||!/^(air|cave_air|void_air)$/.test(target.name))continue;try{await bot.placeBlock(base,new Vec3(0,1,0));placements.push({name:trigger.name,x:p.x+dx,y:p.y,z:p.z+dz});break}catch{}}
      const dust=bot.inventory.items().find(i=>i.name==='redstone'&&i.count>0);if(dust&&placements.length>=2){await bot.equip(dust,'hand');const base=bot.blockAt(new Vec3(p.x,p.y-1,p.z)),target=bot.blockAt(new Vec3(p.x,p.y,p.z));if(base?.boundingBox==='block'&&target&&/^(air|cave_air|void_air)$/.test(target.name)){try{await bot.placeBlock(base,new Vec3(0,1,0));placements.push({name:'redstone',x:p.x,y:p.y,z:p.z})}catch{}}}
      if(placements.length<2)throw new Error('spazio non valido per costruire la difesa redstone')
      const verified=placements.filter(x=>/redstone_torch|lever|pressure_plate/.test(bot.blockAt(new Vec3(x.x,x.y,x.z))?.name||''));if(verified.length<2&&typeof bot.blockAt==='function')throw new Error('difesa redstone non verificata dopo il posizionamento')
      await onShareCheckpoint?.({type:'danger',label:'Difesa redstone',x:p.x,y:p.y,z:p.z,note:`${trigger.name} e torcia posizionati`,source:'redstone'})
      return `difesa redstone costruita con ${placements.length} componenti`
    }
    case 'breed_animals': {
      const food=bot.inventory.items().find(i=>/wheat|carrot|potato|beetroot|seeds|melon_seeds|pumpkin_seeds/.test(i.name));if(!food)throw new Error('nessun alimento per allevamento nell’inventario')
      const species=String(a.species||'');const animals=Object.values(bot.entities).filter(e=>e.type==='mob'&&e.position?.distanceTo(bot.entity.position)<16&&(!species||String(e.name||'').includes(species))).slice(0,2);if(animals.length<2)throw new Error('servono due animali della stessa specie vicini')
      const beforeFood=bot.inventory.items().filter(i=>i.name===food.name).reduce((sum,i)=>sum+(Number(i.count)||0),0),beforeMobs=Object.keys(bot.entities).length
      await bot.equip(food,'hand');let fed=0;for(const animal of animals){try{await bot.pathfinder.goto(new goals.GoalNear(animal.position.x,animal.position.y,animal.position.z,2));await bot.activateEntity(animal);fed++}catch{}}if(fed<2)throw new Error('impossibile nutrire entrambi gli animali')
      await sleep(700);const afterFood=bot.inventory.items().filter(i=>i.name===food.name).reduce((sum,i)=>sum+(Number(i.count)||0),0),afterMobs=Object.keys(bot.entities).length
      if(afterFood>=beforeFood&&afterMobs<=beforeMobs)throw new Error('nutrizione non verificata: il cibo non è diminuito e non è comparso un cucciolo')
      return `allevamento avviato per ${fed} animali${afterMobs>beforeMobs?' con nuova nascita':''}`
    }
    case 'build_memorial': {
      const material=bot.inventory.items().find(i=>/stone|cobblestone|deepslate|planks/.test(i.name)&&i.count>=4);if(!material)throw new Error('servono 4 blocchi per un memoriale')
      await bot.equip(material,'hand');const p=bot.entity.position.floored();let placed=0;const positions=[];for(const [dx,dy,dz] of [[0,0,0],[0,1,0],[-1,0,0],[1,0,0]]){const below=bot.blockAt(new Vec3(p.x+dx,p.y+dy-1,p.z+dz)),target=bot.blockAt(new Vec3(p.x+dx,p.y+dy,p.z+dz));if(!below||below.boundingBox!=='block'||!target||!/^(air|cave_air|void_air)$/.test(target.name))continue;try{await bot.placeBlock(below,new Vec3(0,1,0));positions.push(new Vec3(p.x+dx,p.y+dy,p.z+dz));placed++}catch{}}if(!placed)throw new Error('spazio non valido per il memoriale');if(typeof bot.blockAt==='function'){const verified=positions.filter(pos=>{const block=bot.blockAt(pos);return block&&block.name&&!/^(air|cave_air|void_air)$/.test(block.name)}).length;if(!verified)throw new Error('memoriale non verificato dopo il posizionamento')}let signWritten=false;const sign=bot.inventory.items().find(i=>/_sign$/.test(i.name));if(sign&&typeof bot.updateSign==='function'){try{const base=bot.blockAt(new Vec3(p.x,p.y+1,p.z));if(base&&base.boundingBox==='block'){await bot.equip(sign,'hand');await bot.placeBlock(base,new Vec3(1,0,0));const placedSign=bot.blockAt(new Vec3(p.x+1,p.y+1,p.z));if(placedSign)await bot.updateSign(placedSign,[String(a.name||'Difensore caduto').slice(0,15),'Ricordato dalla','comunità']);signWritten=true}}catch{}}return `memoriale costruito con ${placed} blocchi${signWritten?' e cartello commemorativo':''}`
    }
    case 'craft': {
      const crafted=await craftItem(bot, String(a.name || ''), a.count)
      if(typeof bot.equip==='function'&&(/_(pickaxe|axe|shovel|hoe|sword)$|bow$|crossbow$|shield$|fishing_rod$/.test(resolveCraftName(bot,a.name)))){const fresh=bot.inventory.items().find(i=>i.name===resolveCraftName(bot,a.name)&&i.count>0);if(fresh)await bot.equip(fresh,/shield$/.test(fresh.name)?'off-hand':'hand')}
      return crafted
    }
    case 'smelt': {
      if (typeof bot.openFurnace !== 'function') throw new Error('fonderia non disponibile nel client Minecraft')
      let furnace=bot.findBlock({matching:b=>/^(furnace|blast_furnace|smoker)$/.test(b?.name||''),maxDistance:32})
      if(!furnace){const item=bot.inventory.items().find(i=>/^(furnace|blast_furnace|smoker)$/.test(i.name));if(item){const p=bot.entity.position.floored();await bot.equip(item,'hand');for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const base=bot.blockAt(new Vec3(p.x+dx,p.y-1,p.z+dz)),air=bot.blockAt(new Vec3(p.x+dx,p.y,p.z+dz));if(!base||base.boundingBox!=='block'||!air||!/^(air|cave_air|void_air)$/.test(air.name))continue;try{await bot.placeBlock(base,new Vec3(0,1,0));furnace=bot.blockAt(new Vec3(p.x+dx,p.y,p.z+dz));if(furnace)break}catch{}}}}if(!furnace)throw new Error('nessun forno raggiungibile per fondere')
      await bot.pathfinder.goto(new goals.GoalNear(furnace.position.x,furnace.position.y,furnace.position.z,3))
      const rawName=String(a.name||'').toLowerCase(),input=bot.inventory.items().find(i=>i.name===rawName)||bot.inventory.items().find(i=>/raw_(iron|gold|copper)|iron_ore|gold_ore|copper_ore|beef|porkchop|chicken|mutton|cod|salmon|sand|cobblestone/.test(i.name))
      if(!input)throw new Error('nessun materiale adatto da fondere nell’inventario')
      const fuel=bot.inventory.items().find(i=>/^(coal|charcoal)$/.test(i.name)&&i.count>0)||bot.inventory.items().find(i=>/log|wood|planks|stick/.test(i.name)&&i.count>0)||bot.inventory.items().find(i=>i.name==='lava_bucket'&&i.count>0)
      if(!fuel)throw new Error('nessun combustibile disponibile')
      const lavaFuel=fuel.name==='lava_bucket',emptyBefore=inventoryTotal(bot,x=>x.name==='bucket');const furnaceWindow=await bot.openFurnace(furnace);await furnaceWindow.putFuel(fuel.type,Math.min(fuel.count,Number(a.count)||input.count));await furnaceWindow.putInput(input.type,Math.min(input.count,Number(a.count)||input.count));await sleep(Math.min(12000,Math.max(1000,Number(a.waitMs)||10000)));const output=typeof furnaceWindow.outputItem==='function'?furnaceWindow.outputItem():null;furnaceWindow.close();if(typeof furnaceWindow.outputItem==='function'&&(!output||!output.count))throw new Error(`fusione di ${input.name} avviata ma nessun output verificato`);if(lavaFuel&&typeof bot.inventory?.items==='function'){await sleep(300);const emptyAfter=inventoryTotal(bot,x=>x.name==='bucket');if(emptyAfter<=emptyBefore)throw new Error('combustibile lava consumato ma secchio vuoto non restituito')};return `avviata fusione di ${input.name}`
    }
    case 'sleep': {
      if(typeof bot.sleep!=='function')throw new Error('sonno non disponibile nel client Minecraft')
      let bed=bot.findBlock({matching:b=>/^(white|orange|magenta|light_blue|yellow|lime|pink|gray|light_gray|cyan|purple|blue|brown|green|red|black)?_?bed$/.test(b?.name||''),maxDistance:32})
      if(!bed){const bedItem=bot.inventory.items().find(i=>/_bed$/.test(i.name)&&i.count>0);if(bedItem){const p=bot.entity.position.floored();await bot.equip(bedItem,'hand');for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const base=bot.blockAt(new Vec3(p.x+dx,p.y-1,p.z+dz)),target=bot.blockAt(new Vec3(p.x+dx,p.y,p.z+dz));if(!base||base.boundingBox!=='block'||!target||!/^(air|cave_air|void_air)$/.test(target.name))continue;try{await bot.placeBlock(base,new Vec3(0,1,0));bed=bot.blockAt(new Vec3(p.x+dx,p.y,p.z+dz));if(bed)break}catch{}}}}
      if(!bed)throw new Error('nessun letto raggiungibile')
      await bot.pathfinder.goto(new goals.GoalNear(bed.position.x,bed.position.y,bed.position.z,2));await bot.sleep(bed);return 'notte superata dormendo al sicuro'
    }
    case 'equip': {
      const item = bot.inventory.items().find(i => i.name === String(a.name || ''))
      if (!item) throw new Error(`item not in inventory: ${a.name}`)
      await bot.equip(item, a.destination || 'hand'); if((a.destination||'hand')==='hand'&&'heldItem' in bot&&bot.heldItem&&bot.heldItem.name!==item.name)throw new Error(`equipaggiamento non verificato: ${item.name} non è in mano`); return `equipped ${item.name}`
    }
    case 'eat': {
      const food = bot.inventory.items().find(i => i.name === a.name) || bot.inventory.items().find(i => /bread|apple|beef|porkchop|chicken|mutton|carrot|potato|melon/.test(i.name))
      if (!food) throw new Error('no recognized food')
      const beforeFood=typeof bot.food==='number'?bot.food:null
      await bot.equip(food, 'hand'); await bot.consume(); await sleep(250)
      if(beforeFood!==null&&typeof bot.food==='number'&&bot.food<=beforeFood)throw new Error('cibo consumato ma livello fame non aumentato')
      return `ate ${food.name}`
    }
    case 'fish': {
      if (typeof bot.fish !== 'function') throw new Error('pesca non disponibile nel client Minecraft')
      const rod = bot.inventory.items().find(i => i.name === 'fishing_rod')
      if (!rod) throw new Error('canna da pesca assente')
      const before=inventoryTotal(bot,i=>/^(cod|salmon|tropical_fish|pufferfish)$/.test(i.name));await bot.equip(rod, 'hand'); await bot.fish(); await collectNearbyDrops(bot,20); const after=inventoryTotal(bot,i=>/^(cod|salmon|tropical_fish|pufferfish)$/.test(i.name));if(after<=before)throw new Error('pesca completata ma nessun pesce raccolto');return `pesca completata: ${after-before} pesci raccolti`
    }
    case 'navigate_boat': {
      if (typeof bot.placeEntity !== 'function' || typeof bot.mount !== 'function') throw new Error('navigazione in barca non disponibile nel client')
      const boat = bot.inventory.items().find(i => /_boat$/.test(i.name))
      if (!boat) throw new Error('barca assente')
      const water = bot.findBlock({ matching: b => /^(water|kelp|seagrass)$/.test(b?.name || ''), maxDistance: 16 })
      if (!water) throw new Error('nessuna acqua navigabile vicina')
      await bot.equip(boat, 'hand'); const before=bot.entity.position.clone?bot.entity.position.clone():new Vec3(bot.entity.position.x,bot.entity.position.y,bot.entity.position.z); const entity = await bot.placeEntity(water, new Vec3(0, 1, 0)); await bot.mount(entity)
      try { bot.setControlState?.('forward', true); await sleep(Math.min(10000, Math.max(1000, Number(a.durationMs) || 4000))) }
      finally { bot.setControlState?.('forward', false); try { await bot.dismount?.() } catch {} }
      const after=bot.entity.position, distance=before.distanceTo(after); if(distance<2)throw new Error('barca posata ma nessun avanzamento verificato'); return `barca posata e navigazione completata: ${Math.round(distance)} blocchi`
    }
    case 'build_shelter': {
      const blocks = bot.inventory.items().filter(i => /^(dirt|cobblestone|stone|deepslate|.*_planks)$/.test(i.name) && i.count > 0)
      if (!blocks.length) throw new Error('nessun blocco adatto per costruire un riparo')
      const material = blocks.sort((a, b) => b.count - a.count)[0]; await bot.equip(material, 'hand')
      const p = bot.entity.position.floored ? bot.entity.position.floored() : bot.entity.position; let placed = 0; const positions=[]
      const layout=[[-1,0,-1],[0,0,-1],[1,0,-1],[-1,0,0],[1,0,0],[-1,0,1],[0,0,1],[1,0,1],[-1,1,-1],[0,1,-1],[1,1,-1],[-1,1,0],[1,1,0],[-1,1,1],[0,1,1],[1,1,1],[-1,2,-1],[0,2,-1],[1,2,-1],[-1,2,0],[0,2,0],[1,2,0],[-1,2,1],[0,2,1],[1,2,1]]
      for (const [dx, dy, dz] of layout) {
        if (material.count <= 0) break
        const target = bot.blockAt(new Vec3(p.x + dx, p.y + dy, p.z + dz)), below = bot.blockAt(new Vec3(p.x + dx, p.y + dy - 1, p.z + dz))
        if (!target || !below || below.boundingBox !== 'block' || !/^(air|cave_air|void_air)$/.test(target.name)) continue
        try { await bot.placeBlock(below, new Vec3(0, 1, 0)); positions.push(new Vec3(p.x+dx,p.y+dy,p.z+dz)); placed++; material.count-- } catch {}
      }
      if (!placed) throw new Error('nessun blocco posizionato: spazio non valido o blocchi non raggiungibili')
      if (typeof bot.blockAt === 'function') {
        const verified=positions.filter(pos=>{const block=bot.blockAt(pos);return block&&block.name&&!/^(air|cave_air|void_air)$/.test(block.name)}).length
        if (!verified) throw new Error('riparo non verificato dopo il posizionamento')
      }
      await onShareCheckpoint?.({type:'base',label:'Riparo costruito',x:p.x,y:p.y,z:p.z,note:`${placed} blocchi posizionati`,source:'shelter'})
      return `riparo costruito: ${placed} blocchi posizionati`
    }
    case 'build_door': {
      let door=bot.inventory.items().find(i=>/_door$/.test(i.name)&&i.count>0)
      if(!door){try{await craftItem(bot,'door',1,0);door=bot.inventory.items().find(i=>/_door$/.test(i.name)&&i.count>0)}catch{}}
      if(!door)throw new Error('nessuna porta disponibile e impossibile craftarla')
      const p=bot.entity.position.floored();await bot.equip(door,'hand');let bottom=null
      for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const floor=bot.blockAt(new Vec3(p.x+dx,p.y-1,p.z+dz)),lower=bot.blockAt(new Vec3(p.x+dx,p.y,p.z+dz)),upper=bot.blockAt(new Vec3(p.x+dx,p.y+1,p.z+dz));if(!floor||floor.boundingBox!=='block'||!lower||!upper||!/^(air|cave_air|void_air)$/.test(lower.name)||!/^(air|cave_air|void_air)$/.test(upper.name))continue;try{await bot.placeBlock(floor,new Vec3(0,1,0));bottom=new Vec3(p.x+dx,p.y,p.z+dz);break}catch{}}
      if(!bottom)throw new Error('nessuno spazio sicuro per posizionare la porta')
      await sleep(250);const lower=bot.blockAt(bottom),upper=bot.blockAt(new Vec3(bottom.x,bottom.y+1,bottom.z));if(!/_door$/.test(lower?.name||'')&&!/_door$/.test(upper?.name||''))throw new Error('porta non verificata dopo il posizionamento')
      return `porta costruita a ${bottom.x},${bottom.y},${bottom.z}`
    }
    case 'attack_nearest': {
      const hostile = /zombie|skeleton|creeper|spider|enderman|witch|blaze|ghast|drowned|husk|stray|phantom|pillager|vindicator|ravager|slime|magma_cube|silverfish|endermite|warden|hoglin|piglin_brute|zoglin|wither|guardian|shulker/i
      const requested = String(a.target || a.name || '').toLowerCase()
      const target = bot.nearestEntity(e => e.position.distanceTo(bot.entity.position) < 16 && ((e.type === 'mob' && (requested ? String(e.name || '').toLowerCase() === requested : hostile.test(e.name || ''))) || (allowPvp && e.type === 'player' && e.username !== bot.username)))
      if (!target) throw new Error('no allowed nearby target')
      const weapons=(bot.inventory?.items?.()||[]).filter(i=>/(_sword|_axe|bow|crossbow)$/.test(i.name)&&i.count>0).sort((a,b)=>/sword/.test(b.name)-/sword/.test(a.name)||/diamond/.test(b.name)-/diamond/.test(a.name)||/iron/.test(b.name)-/iron/.test(a.name));
      if(weapons[0]&&typeof bot.equip==='function')await bot.equip(weapons[0],'hand')
      const shield=bot.inventory?.items?.().find(i=>i.name==='shield'); if(shield)try{await bot.equip(shield,'off-hand')}catch{}
      if(bot.registry?.blocksByName){const movement = new Movements(bot); movement.canDig = false; bot.pathfinder.setMovements(movement)}
      await bot.pathfinder.goto(new goals.GoalNear(target.position.x, target.position.y, target.position.z, 2))
      onAttackTarget?.(target); bot.attack(target); await sleep(700); await collectNearbyDrops(bot,16); return `attacked ${target.name || target.username}`
    }
    case 'hunt_nearest': {
      const edible = /cow|pig|chicken|sheep|rabbit|cod|salmon/i
      const target = bot.nearestEntity(e => e.type === 'mob' && edible.test(e.name || '') && e.position.distanceTo(bot.entity.position) < 16)
      if (!target) throw new Error('nessun animale commestibile vicino')
      const weapon=(bot.inventory?.items?.()||[]).filter(i=>/(_sword|_axe)$/.test(i.name)&&i.count>0).sort((a,b)=>/sword/.test(b.name)-/sword/.test(a.name)||/diamond/.test(b.name)-/diamond/.test(a.name)||/iron/.test(b.name)-/iron/.test(a.name))[0]
      if(weapon&&typeof bot.equip==='function')await bot.equip(weapon,'hand')
      if(bot.registry?.blocksByName){const movement = new Movements(bot); movement.canDig = false; bot.pathfinder.setMovements(movement)}
      await bot.pathfinder.goto(new goals.GoalNear(target.position.x, target.position.y, target.position.z, 2)); onAttackTarget?.(target); bot.attack(target); await sleep(700); await collectNearbyDrops(bot,16); return `cacciato ${target.name || 'animale'} e raccolti i drop`
    }
    default: throw new Error(`unsupported action ${decision.action}`)
  }
}
export function autonomousProgressionDecision(bot, observation = {}, checkpoints = []) {
  const items=bot.inventory?.items?.()||[], occupiedSlots=Array.isArray(bot.inventory?.slots)?bot.inventory.slots.filter(Boolean).length:items.length, has=name=>items.some(x=>x.name===name&&x.count>0), food=items.find(x=>/bread|apple|beef|porkchop|chicken|mutton|carrot|potato|melon/.test(x.name)), logs=items.reduce((n,x)=>n+(/(_log|_wood|_stem|_hyphae)$/.test(x.name)?x.count:0),0), planks=items.reduce((n,x)=>n+(/_planks$/.test(x.name)?x.count:0),0), table=has('crafting_table')||!!bot.findBlock?.({matching:bot.registry?.blocksByName?.crafting_table?.id,maxDistance:6}), sheltered=checkpoints.some(x=>x.type==='base'||/riparo|base|shelter/i.test(x.label||''))
  const wornTool=items.find(x=>/_pickaxe$|_axe$|_shovel$|_sword$|fishing_rod$/.test(x.name)&&Number.isFinite(Number(x.maxDurability))&&Number(x.maxDurability)>0&&((Number(x.durabilityUsed)||0)/Number(x.maxDurability))>=0.8)
  const equipment=Array.isArray(observation.equipment)?observation.equipment:[]
  const armorSlots=[['helmet','head'],['chestplate','torso'],['leggings','legs'],['boots','feet']]
  const armorMaterial=inventoryTotal(bot,x=>x.name==='diamond')>=8?'diamond':inventoryTotal(bot,x=>x.name==='iron_ingot')>=8?'iron':null
  const nearbyEntities=Array.isArray(observation.nearbyEntities)?observation.nearbyEntities:[], nearbyBlocks=Array.isArray(observation.nearbyBlocks)?observation.nearbyBlocks:[]
  const hostileNames=/zombie|skeleton|creeper|spider|enderman|witch|blaze|ghast|drowned|husk|stray|phantom|pillager|vindicator|ravager|slime|magma_cube|silverfish|endermite|warden|hoglin|piglin_brute|zoglin|wither|guardian|shulker/i
  const iron=inventoryTotal(bot,x=>x.name==='iron_ingot')
  const sticks=inventoryTotal(bot,x=>x.name==='stick'),stringCount=inventoryTotal(bot,x=>x.name==='string'),featherCount=inventoryTotal(bot,x=>x.name==='feather'),flintCount=inventoryTotal(bot,x=>x.name==='flint'),arrowCount=inventoryTotal(bot,x=>x.name==='arrow')
  const hostile=nearbyEntities.find(x=>x?.type==='mob'&&hostileNames.test(String(x.name||'')))
  const visibleTargets=Array.isArray(observation.visibleTargets)?observation.visibleTargets:[]
  const mode=String(observation.gameMode||bot.game?.gameMode||'survival').toLowerCase()
  if(mode==='spectator')return{thought:'Modalità spettatore: osservazione senza azioni fisiche.',goal:'osservare e riferire la zona',action:'wait',args:{ms:3000},expected:'nessuna azione fisica'}
  if(mode==='creative'){
    if(nearbyBlocks.some(x=>/^(lava|water)$/.test(typeof x==='string'?x:x?.name||'')))return{thought:'Creative: pericolo rilevato, cercare una posizione sicura senza raccolta survival.',goal:'allontanarsi dal pericolo',action:'escape_hazard',args:{},expected:'posizione sicura'}
    if(!sheltered)return{thought:'Creative: costruire direttamente un riparo.',goal:'costruire un riparo sicuro',action:'build_shelter',args:{},expected:'riparo costruito'}
    return{thought:'Creative: esplorare una nuova area e aggiornare la mappa.',goal:'esplorare il mondo',action:'explore',args:{radius:32},expected:'nuova area esplorata'}
  }
  if(observation.inFluid||/^(water|lava|flowing_water|flowing_lava)$/i.test(String(observation.feetBlock||''))||/^(water|lava|flowing_water|flowing_lava)$/i.test(String(observation.headBlock||'')))return{thought:'Emergenza ambientale: acqua o lava occupa lo spazio del bot.',goal:'uscire immediatamente dal fluido prima di raccogliere o esplorare',action:'escape_hazard',args:{},expected:'piedi e testa fuori dal fluido'}
  if(Number.isFinite(Number(observation.oxygen))&&Number(observation.oxygen)<=4&&(observation.inFluid||nearbyBlocks.some(x=>/^(water|kelp|seagrass)$/.test(typeof x==='string'?x:x?.name||''))))return{thought:'Emergenza: ossigeno quasi esaurito durante l’immersione.',goal:'raggiungere aria aperta immediatamente',action:'escape_hazard',args:{},expected:'ossigeno in recupero e posizione fuori dall’acqua'}
  if(nearbyEntities.some(x=>x?.name==='item'))return{thought:'Raccolta automatica: oggetto lasciato vicino.',goal:'raccogliere gli oggetti caduti',action:'collect_drops',args:{maxDistance:24},expected:'oggetti nell inventario'}
  const farmAnimals=nearbyEntities.filter(x=>/^(cow|pig|sheep|chicken|rabbit|goat|horse|llama|donkey|camel)$/.test(String(x?.name||'')))
  const wool=inventoryTotal(bot,x=>/_wool$/.test(x.name))
  const foodCount=items.reduce((n,x)=>n+(/bread|apple|beef|porkchop|chicken|mutton|carrot|potato|melon|cod|salmon|rabbit/.test(x.name)?x.count:0),0)
  const hasPen=checkpoints.some(x=>x.type==='pen'||/recinto allevamento/i.test(x.label||''))
  if(farmAnimals.length>=2&&!hasPen&&items.some(x=>/_fence$|cobblestone|dirt|_planks$/.test(x.name)))return{thought:'Allevamento: costruire prima un recinto sicuro.',goal:'costruire un recinto per gli animali',action:'build_pen',args:{},expected:'recinto costruito'}
  if(farmAnimals.length>=2&&hasPen&&items.some(x=>/wheat|carrot|potato|beetroot|seeds/.test(x.name)))return{thought:'Allevamento: recinto verificato, animali e cibo disponibili.',goal:'avviare un allevamento protetto',action:'breed_animals',args:{species:farmAnimals[0].name},expected:'due animali nutriti'}
  if(items.length>=20||occupiedSlots>=30)return{thought:'Inventario quasi pieno: gli slot occupati superano la soglia sicura.',goal:'organizzare le risorse in un contenitore sicuro',action:'store_items',args:{maxDistance:32},expected:'materiali depositati e inventario ottimizzato'}
  if(nearbyBlocks.some(x=>/^(chest|trapped_chest|barrel)$/.test(typeof x==='string'?x:x?.name||'')))return{thought:'Memoria automatica: ispezionare il contenitore vicino.',goal:'leggere il contenuto della chest',action:'inspect_storage',args:{},expected:'contenuto registrato nella memoria'}
  if(Number(observation.health)>0&&Number(observation.health)<6&&!food)return{thought:'Emergenza: salute critica senza cibo.',goal:'raggiungere una posizione sicura e chiedere aiuto',action:'escape_hazard',args:{},expected:'uscire dal pericolo senza costruire'}
  const time=Number(observation.time)
  const night=time>=12500&&time<=23500,bedNear=nearbyBlocks.some(x=>/bed$/.test(typeof x==='string'?x:x?.name||''))||!!bot.findBlock?.({matching:b=>/bed$/.test(b?.name||''),maxDistance:32})
  if(night&&bedNear)return{thought:'Sopravvivenza: è notte e un letto sicuro è vicino.',goal:'dormire per superare la notte',action:'sleep',args:{},expected:'notte superata senza esporsi ai mostri'}
  if(night&&!bedNear&&!items.some(x=>/_bed$/.test(x.name))&&wool>=3&&planks>=3&&table)return{thought:'Sopravvivenza notturna: craftare un letto e posizionarlo prima dell’arrivo dei mob.',goal:'creare un letto per passare la notte al sicuro',action:'craft',args:{name:'bed',count:1},expected:'letto nell inventario'}
  if(hostile&&Number(observation.health)>0&&Number(observation.health)<8)return{thought:'Pericolo: mob ostile vicino e salute bassa.',goal:'allontanarsi dal mob ostile',action:'escape_hazard',args:{},expected:'distanza di sicurezza'}
  const closeHostile=hostile&&Number(hostile.distance||999)<=4
  const hasWeaponNow=items.some(x=>/_sword$|_axe$|bow|crossbow/.test(x.name)&&Number(x.count)>0)
  if(closeHostile&&!hasWeaponNow&&!table)return{thought:'Pericolo immediato: un mob ostile è a distanza ravvicinata e il bot non è armato.',goal:'fuggire prima di essere colpito e cercare materiali in sicurezza',action:'escape_hazard',args:{},expected:'distanza di sicurezza dal mob'}
  if(Number(observation.food)<8&&food)return{thought:'Priorità survival: fame bassa.',goal:'mangiare per sopravvivere',action:'eat',args:{name:food.name},expected:'fame sopra la soglia'}
  if(Number(observation.food)>0&&Number(observation.food)<6&&!food){const baseCheckpoint=checkpoints.filter(x=>x&&x.type==='base'&&Number.isFinite(Number(x.x))&&Number.isFinite(Number(x.y))&&Number.isFinite(Number(x.z))).sort((a,b)=>checkpointDistanceFrom(bot.entity?.position,a)-checkpointDistanceFrom(bot.entity?.position,b))[0];if(baseCheckpoint)return{thought:'Fame critica senza scorte: rientrare alla base invece di continuare la spedizione.',goal:'tornare alla base per recuperare cibo',action:'move_to',args:{x:baseCheckpoint.x,y:baseCheckpoint.y,z:baseCheckpoint.z,range:3,poi:baseCheckpoint.label||'base'},expected:'base raggiunta prima di esaurire la fame'}}
  if(Number(observation.health)>0&&Number(observation.health)<8&&food)return{thought:'Priorità survival: salute critica.',goal:'mangiare e cercare sicurezza',action:'eat',args:{name:food.name},expected:'salute stabilizzata'}
  const hasShelterCheckpoint=checkpoints.some(x=>x&&(x.type==='shelter'||/riparo|shelter/i.test(x.label||'')))
  if(night&&hostile&&!hasShelterCheckpoint){const baseCheckpoint=checkpoints.filter(x=>x&&x.type==='base'&&Number.isFinite(Number(x.x))&&Number.isFinite(Number(x.y))&&Number.isFinite(Number(x.z))).sort((a,b)=>checkpointDistanceFrom(bot.entity?.position,a)-checkpointDistanceFrom(bot.entity?.position,b))[0];if(baseCheckpoint)return{thought:'Notte e minaccia vicina: rientrare al riparo prima di esplorare o combattere.',goal:'tornare alla base prima che i mob aumentino',action:'move_to',args:{x:baseCheckpoint.x,y:baseCheckpoint.y,z:baseCheckpoint.z,range:3,poi:baseCheckpoint.label||'base'},expected:'base raggiunta e posizione protetta'}}
  const nearbyPlayer=nearbyEntities.find(x=>x?.type==='player'&&x.username&&x.username!==bot.username)
  const surplusFood=items.find(x=>/bread|apple|beef|porkchop|chicken|mutton|carrot|potato|melon|cod|salmon/.test(x.name)&&Number(x.count)>8)
  if(nearbyPlayer&&surplusFood)return{thought:'Cooperazione: un giocatore è vicino e ho una scorta alimentare sufficiente.',goal:`condividere cibo con ${nearbyPlayer.username}`,action:'give_item',args:{username:nearbyPlayer.username,name:surplusFood.name,count:1},expected:'cibo consegnato e memoria sociale aggiornata'}
  const surplusMaterial=items.find(x=>(x.name==='torch'&&x.count>16)||(x.name==='iron_ingot'&&x.count>8)||(x.name==='cobblestone'&&x.count>32))
  if(nearbyPlayer&&surplusMaterial)return{thought:'Cooperazione: condividere una risorsa eccedente con il compagno vicino.',goal:`condividere ${surplusMaterial.name} con ${nearbyPlayer.username}`,action:'give_item',args:{username:nearbyPlayer.username,name:surplusMaterial.name,count:Math.min(4,surplusMaterial.count-1)},expected:'materiale consegnato senza esaurire la riserva'}
  const armed=items.some(x=>/_sword$|_axe$|bow|crossbow/.test(x.name)&&Number(x.count)>0)
  const dangerousTarget=visibleTargets.find(x=>x&&/spawner|end_gateway|portal/.test(String(x.name||'')))
  const weaponMaterial=inventoryTotal(bot,x=>/^(iron_ingot|diamond|cobblestone|blackstone|oak_planks|birch_planks|spruce_planks|jungle_planks|acacia_planks|dark_oak_planks|mangrove_planks|cherry_planks)$/.test(x.name))
  if(dangerousTarget&&!armed&&!nearbyPlayer&&table&&weaponMaterial>=2)return{thought:`Pericolo individuato: preparare un’arma prima di avvicinarsi a ${dangerousTarget.name}.`,goal:`craftare un’arma per affrontare ${dangerousTarget.name} in sicurezza`,action:'craft',args:{name:'sword',count:1},expected:'arma pronta prima della spedizione'}
  if(nearbyPlayer&&dangerousTarget&&!armed)return{thought:'Pericolo condiviso: ho trovato un punto ostile ma non sono armato.',goal:`chiedere a ${nearbyPlayer.username} aiuto per ${dangerousTarget.name}`,action:'chat',args:{message:`@${nearbyPlayer.username} ho trovato ${dangerousTarget.name}, mi serve un’arma o il tuo aiuto prima di avvicinarmi.`},expected:'compagno informato e assistenza richiesta'}
  if(wornTool&&table)return{thought:'Manutenzione preventiva: un attrezzo è quasi consumato.',goal:`sostituire ${wornTool.name} prima di restare senza strumento`,action:'craft',args:{name:wornTool.name,count:1,replaceWorn:true},expected:`nuovo ${wornTool.name} craftato e impugnato`}
  for(const [part,destination] of armorSlots){if(!equipment.some(name=>String(name).endsWith(`_${part}`))){const armor=items.filter(x=>String(x.name).endsWith(`_${part}`)).sort((a,b)=>/diamond/.test(b.name)-/diamond/.test(a.name)||/iron/.test(b.name)-/iron/.test(a.name))[0];if(armor)return{thought:'Difesa preventiva: armatura disponibile ma non indossata.',goal:`indossare ${armor.name} prima di esplorare`,action:'equip',args:{name:armor.name,destination},expected:`${armor.name} equipaggiato`}}}
  if(table&&armorMaterial){for(const part of ['chestplate','helmet','leggings','boots'])if(!has(`${armorMaterial}_${part}`))return{thought:'Difesa preventiva: materiali sufficienti per un pezzo di armatura.',goal:`craftare ${armorMaterial}_${part} per aumentare la sopravvivenza`,action:'craft',args:{name:`${armorMaterial}_${part}`,count:1},expected:`${armorMaterial}_${part} nell’inventario`}}
  const edible=farmAnimals.filter(x=>/^(cow|pig|chicken|sheep|rabbit)$/.test(String(x?.name||'')))
  const matureCrop=nearbyBlocks.some(x=>/^(wheat|carrots|potatoes|beetroots|nether_wart|sweet_berry_bush)$/.test(typeof x==='string'?x:x?.name||''))
  if(matureCrop&&foodCount<12)return{thought:'Agricoltura: una coltura matura può aumentare la riserva senza cacciare.',goal:'raccogliere colture mature per la scorta',action:'harvest_crops',args:{count:4},expected:'raccolto verificato nell inventario'}
  const seed=items.find(x=>/^(wheat_seeds|beetroot_seeds|carrot|potato|melon_seeds|pumpkin_seeds)$/.test(x.name)&&x.count>0)
  if(seed&&!nearbyBlocks.some(x=>String(typeof x==='string'?x:x?.name||'')==='farmland')&&nearbyBlocks.some(x=>/^(dirt|grass_block)$/.test(typeof x==='string'?x:x?.name||''))&&nearbyBlocks.some(x=>String(typeof x==='string'?x:x?.name||'')==='water'))return{thought:'Agricoltura: semi, terra e acqua disponibili ma manca terreno arato.',goal:'preparare un campo irrigato prima della semina',action:'prepare_farm',args:{},expected:'terra trasformata in farmland vicino all’acqua'}
  if(seed&&nearbyBlocks.some(x=>String(typeof x==='string'?x:x?.name||'')==='farmland'))return{thought:'Agricoltura: semi e terreno arato disponibili, avviare una coltura rinnovabile.',goal:'piantare semi per creare una riserva alimentare',action:'plant_crops',args:{count:Math.min(4,seed.count)},expected:'colture piantate e semi consumati'}
  if(foodCount<4&&(foodCount===0||Number(observation.food)>=8)&&edible.length&&farmAnimals.length<2)return{thought:'Scorta preventiva: poche provviste e animale commestibile vicino.',goal:`cacciare ${edible[0].name} per creare una riserva di cibo`,action:'hunt_nearest',args:{target:edible[0].name},expected:'carne raccolta e scorta aumentata'}
  if(hostile&&!items.some(x=>/_sword$|_axe$/.test(x.name))&&table)return{thought:'Difesa: un mob ostile è vicino e manca un’arma.',goal:'creare un’arma per difendersi',action:'craft',args:{name:'sword',count:1},expected:'arma nell inventario'}
  if(table&&!has('shield')&&iron>=1&&planks>=1)return{thought:'Difesa preventiva: creare uno scudo prima di rischiare esplorazioni.',goal:'creare uno scudo per ridurre i danni',action:'craft',args:{name:'shield',count:1},expected:'scudo nell inventario'}
  if(hostile&&items.some(x=>/_sword$|_axe$/.test(x.name)))return{thought:'Difesa: affrontare il mob ostile prima che raggiunga il bot.',goal:`difendersi da ${hostile.name}`,action:'attack_nearest',args:{target:hostile.name},expected:'mob ostile sconfitto o distanza sicura'}
  if(table&&!items.some(x=>x.name==='bow')&&stringCount>=3&&sticks>=3)return{thought:'Difesa a distanza: preparare un arco per affrontare mob senza esporsi.',goal:'craftare un arco per la difesa a distanza',action:'craft',args:{name:'bow',count:1},expected:'arco nell inventario'}
  if(table&&items.some(x=>x.name==='bow')&&arrowCount<8&&flintCount>0&&featherCount>0&&sticks>0)return{thought:'Difesa a distanza: rifornire le frecce dell’arco.',goal:'craftare frecce per la difesa',action:'craft',args:{name:'arrow',count:Math.min(16,flintCount,featherCount,sticks)},expected:'frecce nell inventario'}
  const nearWater=nearbyBlocks.some(x=>/^(water|kelp|seagrass)$/.test(typeof x==='string'?x:x?.name||''))
  if(nearWater&&!food&&has('fishing_rod')&&typeof bot.fish==='function')return{thought:'Sopravvivenza: acqua vicina e nessun cibo, pescare.',goal:'procurarsi cibo pescando',action:'fish',args:{},expected:'pesce raccolto'}
  if(nearWater&&!has('fishing_rod')&&stringCount>=2&&sticks>=3)return{thought:'Esplorazione: acqua vicina e materiali completi, preparare una canna da pesca.',goal:'creare una canna da pesca',action:'craft',args:{name:'fishing_rod',count:1},expected:'canna da pesca nell inventario'}
  const hasBoat=items.some(x=>/_boat$/.test(x.name)&&x.count>0)
  if(nearWater&&!hasBoat&&planks>=5)return{thought:'Esplorazione: acqua attraversabile, preparare una barca.',goal:'creare una barca per navigare',action:'craft',args:{name:'boat',count:1},expected:'barca nell inventario'}
  if(nearWater&&hasBoat&&typeof bot.placeEntity==='function')return{thought:'Esplorazione: barca disponibile e acqua navigabile.',goal:'attraversare l’acqua e scoprire una nuova area',action:'navigate_boat',args:{durationMs:4000},expected:'nuova area esplorata via acqua'}
  const cobble=inventoryTotal(bot,x=>/^(cobblestone|blackstone|cobbled_deepslate)$/.test(x.name)), redstone=inventoryTotal(bot,x=>x.name==='redstone')
  const hasPickaxe=items.some(x=>/_pickaxe$/.test(x.name)&&x.count>0)
  const torches=inventoryTotal(bot,x=>x.name==='torch'),coal=inventoryTotal(bot,x=>/^(coal|charcoal)$/.test(x.name))
  if(table&&torches<8&&coal>0&&sticks>0)return{thought:'Esplorazione sicura: preparare torce per illuminare caverne e segnare il percorso.',goal:'craftare torce per esplorare senza perdersi',action:'craft',args:{name:'torch',count:Math.min(16,coal*4,sticks)},expected:'torce nell inventario'}
  const ironName=nearbyBlocks.map(x=>typeof x==='string'?x:x?.name||'').find(x=>/^(iron_ore|deepslate_iron_ore)$/.test(x)),coalName=nearbyBlocks.map(x=>typeof x==='string'?x:x?.name||'').find(x=>/^(coal_ore|deepslate_coal_ore)$/.test(x))
  if(table&&hasPickaxe&&iron<3&&ironName)return{thought:'Progressione tecnologica: ferro visibile e scorta insufficiente.',goal:'raccogliere ferro per secchio, scudo e strumenti',action:'collect_block',args:{name:ironName,count:3,maxDistance:32},expected:'minerale di ferro raccolto'}
  if(table&&hasPickaxe&&inventoryTotal(bot,x=>/^(coal|charcoal)$/.test(x.name))<8&&coalName)return{thought:'Sopravvivenza: carbone visibile e torce insufficienti.',goal:'raccogliere carbone per torce e combustibile',action:'collect_block',args:{name:coalName,count:4,maxDistance:32},expected:'carbone raccolto'}
  const rareName=nearbyBlocks.map(x=>typeof x==='string'?x:x?.name||'').find(x=>/^(diamond_ore|deepslate_diamond_ore|gold_ore|deepslate_gold_ore)$/.test(x)),hasDiamond=inventoryTotal(bot,x=>x.name==='diamond')>0,hasGold=inventoryTotal(bot,x=>/^(gold_ingot|raw_gold)$/.test(x.name))>0,hasIronPickaxe=items.some(x=>/^(iron|diamond|netherite)_pickaxe$/.test(x.name)&&Number(x.count)>0)
  if(table&&hasPickaxe&&hasIronPickaxe&&rareName&&(/diamond/.test(rareName)?!hasDiamond:!hasGold))return{thought:`Scoperta rara: ${rareName} visibile e piccone adeguato disponibile.`,goal:`raccogliere ${rareName} per sbloccare nuove tecnologie`,action:'collect_block',args:{name:rareName,count:1,maxDistance:32},expected:`${rareName} raccolto nell’inventario`}
  const blazePowder=inventoryTotal(bot,x=>x.name==='blaze_powder'), pearls=inventoryTotal(bot,x=>x.name==='ender_pearl'), eyes=inventoryTotal(bot,x=>x.name==='ender_eye')
  if(table&&blazePowder>0&&pearls>0&&eyes<12)return{thought:'Campagna End: preparare una scorta affidabile di Eyes of Ender.',goal:'craftare Eyes of Ender per cercare la stronghold',action:'craft',args:{name:'ender_eye',count:Math.min(4,blazePowder,pearls,12-eyes)},expected:'Eyes of Ender nell’inventario'}
  const furnaceNear=nearbyBlocks.some(x=>/^(furnace|blast_furnace|smoker)$/.test(typeof x==='string'?x:x?.name||''))||!!bot.findBlock?.({matching:b=>/^(furnace|blast_furnace|smoker)$/.test(b?.name||''),maxDistance:32})
  const smeltable=items.find(x=>/raw_(iron|gold|copper)|(_ore)$|beef|porkchop|chicken|mutton|cod|salmon|sand|cobblestone/.test(x.name)&&x.count>0),fuel=items.some(x=>/coal|charcoal|log|wood|planks|stick|lava_bucket/.test(x.name)&&x.count>0)
  if((furnaceNear||has('furnace')||has('smoker'))&&smeltable&&fuel)return{thought:'Produzione: materiale grezzo e combustibile disponibili.',goal:`fondere ${smeltable.name} per ottenere risorse utili`,action:'smelt',args:{name:smeltable.name,count:Math.min(smeltable.count,8)},expected:'materiale cotto o raffinato nell’output del forno'}
  if(table&&!has('furnace')&&cobble>=8)return{thought:'Tecnologia di base: trasformare la pietra in un forno.',goal:'creare un forno per fondere materiali e cucinare',action:'craft',args:{name:'furnace',count:1},expected:'forno nell inventario'}
  if(table&&!has('redstone_torch')&&redstone>=1&&sticks>=1)return{thought:'Difesa sperimentale: creare un componente redstone.',goal:'creare una torcia redstone per un meccanismo',action:'craft',args:{name:'redstone_torch',count:1},expected:'torcia redstone nell inventario'}
  if(table&&has('redstone_torch')&&!has('lever')&&cobble>=1&&sticks>=1)return{thought:'Automazione: completare un comando manuale per il circuito.',goal:'creare una leva per azionare la difesa',action:'craft',args:{name:'lever',count:1},expected:'leva nell inventario'}
  if(table&&has('redstone_torch')&&!has('stone_pressure_plate')&&cobble>=2)return{thought:'Automazione: preparare un sensore di passaggio.',goal:'creare una piastra a pressione per la trappola',action:'craft',args:{name:'stone_pressure_plate',count:1},expected:'piastra a pressione nell inventario'}
  const redstoneTrigger=items.some(x=>/^(lever|stone_pressure_plate|oak_pressure_plate|spruce_pressure_plate|birch_pressure_plate)$/.test(x.name))
  if(table&&has('redstone_torch')&&redstoneTrigger&&sheltered)return{thought:'Difesa: componenti redstone pronti, costruire un punto di controllo vicino alla base.',goal:'posizionare una difesa redstone condivisibile',action:'build_redstone_defense',args:{},expected:'torcia e comando redstone posizionati'}
  const flint=inventoryTotal(bot,x=>x.name==='flint'), nearFluid=nearbyBlocks.some(x=>/^(lava|water)$/.test(typeof x==='string'?x:x?.name||'')), knownPortal=checkpoints.some(x=>x.type==='portal'||/portal|nether/i.test(x.label||''))
  if(table&&!has('bucket')&&iron>=3&&nearFluid)return{thought:'Gestione ambientale: fluido vicino, preparare un secchio senza sprecare ferro.',goal:'creare un secchio per controllare acqua o lava',action:'craft',args:{name:'bucket',count:1},expected:'secchio nell inventario'}
  if(has('bucket')&&!has('water_bucket')&&nearbyBlocks.some(x=>/^(water|kelp|seagrass)$/.test(typeof x==='string'?x:x?.name||'')))return{thought:'Gestione ambientale: una sorgente d’acqua può diventare una risorsa sicura e riutilizzabile.',goal:'raccogliere acqua in un secchio',action:'collect_fluid',args:{fluid:'water'},expected:'acqua nel secchio'}
  if(has('bucket')&&!has('lava_bucket')&&nearbyBlocks.some(x=>String(typeof x==='string'?x:x?.name||'')==='lava'))return{thought:'Gestione ambientale: una sorgente di lava può diventare combustibile o una barriera difensiva.',goal:'raccogliere lava in un secchio da usare in sicurezza',action:'collect_fluid',args:{fluid:'lava'},expected:'lava nel secchio'}
  if(has('water_bucket')&&nearbyBlocks.some(x=>String(typeof x==='string'?x:x?.name||'')==='lava'))return{thought:'Sperimentazione controllata: acqua e lava vicine permettono di produrre ossidiana senza esporsi al fluido.',goal:'raffreddare una sorgente di lava e creare ossidiana',action:'cool_lava',args:{maxDistance:12},expected:'lava trasformata in ossidiana o pietra verificata'}
  if(table&&!has('flint_and_steel')&&iron>=1&&flint>=1&&(nearFluid||knownPortal))return{thought:'Esplorazione pianificata: preparare l’acciarino solo per un portale o una zona di fluidi.',goal:'creare un acciarino per un portale o una difesa',action:'craft',args:{name:'flint_and_steel',count:1},expected:'acciarino nell inventario'}
  if(logs<2&&planks<4)return{thought:'Progressione automatica: servono materiali primari.',goal:'raccogliere legno',action:'collect_wood',args:{count:4},expected:'legno nell inventario'}
  if(!table&& (logs>0||planks>=4))return{thought:'Progressione automatica: banco da lavoro mancante.',goal:'creare e posizionare un banco',action:'craft',args:{name:'crafting_table',count:1},expected:'banco disponibile'}
  if(table&&!items.some(x=>/_pickaxe$/.test(x.name)))return{thought:'Progressione automatica: utensile base mancante.',goal:'creare un piccone',action:'craft',args:{name:'pickaxe',count:1},expected:'piccone nell inventario'}
  if(table&&!items.some(x=>/_axe$/.test(x.name)))return{thought:'Progressione automatica: ascia mancante.',goal:'creare un ascia',action:'craft',args:{name:'axe',count:1},expected:'ascia nell inventario'}
  if(table&&!has('chest'))return{thought:'Progressione automatica: contenitore mancante.',goal:'creare una chest',action:'craft',args:{name:'chest',count:1},expected:'chest nell inventario'}
  if(table&&!items.some(x=>/_shovel$/.test(x.name))&&nearbyBlocks.some(x=>/^(dirt|sand|gravel|clay)$/.test(typeof x==='string'?x:x?.name||'')))return{thought:'Strumento contestuale: terra o sabbia visibili e nessuna pala disponibile.',goal:'creare una pala per scavi, ripari e raccolta del terreno',action:'craft',args:{name:'shovel',count:1},expected:'pala nell’inventario'}
  if(!sheltered&&items.some(x=>/^(dirt|cobblestone|stone|deepslate|.*_planks)$/.test(x.name)))return{thought:'Progressione automatica: nessun riparo registrato.',goal:'costruire un riparo sicuro',action:'build_shelter',args:{},expected:'riparo costruito'}
  if(sheltered&&!items.some(x=>/_door$/.test(x.name))&&planks>=6)return{thought:'Sicurezza della base: chiudere l’ingresso con una porta per impedire l’accesso ai mob.',goal:'costruire una porta verificata per il riparo',action:'build_door',args:{},expected:'porta posizionata'}
  // Mining is a deterministic progression step, not an implicit side effect
  // of exploration.  Keep it after immediate survival/base safety so a bot
  // never abandons an exposed shelter just to gather stone.
  if(table&&hasPickaxe&&cobble<8){
    const visibleStone=nearbyBlocks.some(x=>/^(stone|deepslate|cobblestone|blackstone|tuff)$/.test(typeof x==='string'?x:x?.name||''))
    if(!visibleStone)return{thought:'Progressione mineraria: il piccone è pronto ma la pietra non è ancora caricata nella zona visibile.',goal:'esplorare una zona sicura per trovare pietra prima di minare',action:'explore',args:{radius:24},expected:'nuova area caricata con pietra raggiungibile'}
    return{thought:'Progressione mineraria: il piccone è pronto ma mancano pietra e cobblestone per forno e strumenti.',goal:'minare pietra con il piccone per sbloccare la tecnologia di base',action:'collect_block',args:{name:'stone',count:Math.min(8-cobble,8),maxDistance:32},expected:'almeno otto blocchi di cobblestone nell’inventario'}
  }
  const priorityTarget=visibleTargets.filter(x=>x&&Number.isFinite(Number(x.x))&&Number.isFinite(Number(x.y))&&Number.isFinite(Number(x.z))&&!/^(lava|water)$/.test(String(x.name||''))&&(!/spawner|end_gateway|portal/.test(String(x.name||''))||armed)).sort((a,b)=>{const score=x=>/portal|end_gateway|ancient_debris|spawner/.test(x.name)?0:/diamond_ore|iron_ore|gold_ore|chest|barrel|furnace|crafting_table/.test(x.name)?1:2;return score(a)-score(b)||Number(a.distance||999)-Number(b.distance||999)})[0]
  if(priorityTarget&&Number(priorityTarget.distance||999)<=48)return{thought:`Obiettivo visibile: ${priorityTarget.name} può sbloccare una nuova fase della spedizione.`,goal:`raggiungere ${priorityTarget.name} individuato nella mappa`,action:'move_to',args:{x:priorityTarget.x,y:priorityTarget.y,z:priorityTarget.z,range:2,poi:priorityTarget.name},expected:`raggiungere il punto di interesse ${priorityTarget.name}`}
  const origin=bot.entity?.position
  const checkpointDistance=x=>checkpointDistanceFrom(origin,x)
  const dimension=String(bot.game?.dimension||'overworld')
  const teamTarget=checkpoints.filter(x=>x&&Number.isFinite(Number(x.x))&&Number.isFinite(Number(x.y))&&Number.isFinite(Number(x.z))&&(!x.dimension||String(x.dimension)===dimension)&&!/danger|lava|water/i.test(`${x.type||''} ${x.label||''}`)&&checkpointDistance(x)>4).sort((a,b)=>checkpointDistance(a)-checkpointDistance(b))[0]
  if(teamTarget)return{thought:`Coordinamento: raggiungere il checkpoint condiviso ${teamTarget.label||teamTarget.type}.`,goal:`raggiungere il checkpoint di squadra ${teamTarget.label||teamTarget.type}`,action:'move_to',args:{x:teamTarget.x,y:teamTarget.y,z:teamTarget.z,range:3,poi:teamTarget.label||teamTarget.type},expected:'checkpoint di squadra raggiunto'}
  // Once immediate survival needs are satisfied, keep the world-learning
  // loop alive even when the language model returns no plan. Exploration is
  // bounded and becomes a reusable episode through the normal learner.
  const radius=checkpoints.length<3?24:36
  return{thought:'Nessuna urgenza: avvio una nuova sfida di esplorazione controllata.',goal:'esplorare una nuova area e cercare risorse o punti di interesse',action:'explore',args:{radius},expected:'posizione o conoscenza del mondo aggiornata'}
}
