const cache=new WeakMap()
const strategic=name=>/(_ore|_log|_wood|_stem|_hyphae|ancient_debris|chest|barrel|crafting_table|furnace|smoker|anvil|enchanting_table|brewing_stand|spawner|portal|end_gateway|lava|water)$/.test(name||'')
function scan(bot,p,radius){const old=cache.get(bot);if(old&&old.radius===radius&&Date.now()-old.at<2500&&old.position.distanceTo(p)<4)return old.data
  const nearby=[...new Set(bot.findBlocks({matching:()=>true,maxDistance:Math.min(16,radius),count:120}).map(pos=>bot.blockAt(pos)?.name).filter(Boolean))].slice(0,40)
  const targets=bot.findBlocks({matching:b=>strategic(b?.name),maxDistance:radius,count:120}).map(pos=>{const b=bot.blockAt(pos);return b&&{name:b.name,x:Math.floor(pos.x),y:Math.floor(pos.y),z:Math.floor(pos.z),distance:Math.round(pos.distanceTo(p))}}).filter(Boolean).sort((a,b)=>a.distance-b.distance).slice(0,80)
  const entities=Object.values(bot.entities).filter(e=>e!==bot.entity&&e.position&&e.position.distanceTo(p)<radius).sort((a,b)=>a.position.distanceTo(p)-b.position.distanceTo(p)).slice(0,40).map(e=>({name:e.username||e.name,type:e.type,x:Math.floor(e.position.x),y:Math.floor(e.position.y),z:Math.floor(e.position.z),distance:Math.round(e.position.distanceTo(p))}))
  const data={nearby,targets,entities};cache.set(bot,{at:Date.now(),radius,position:p.clone?p.clone():p,data});return data
}
export function observe(bot, options={}) {
  const p = bot.entity.position
  const radius=Math.max(16,Math.min(Number(options.visionRadius)||48,64)),vision=scan(bot,p,radius)
  const inventory = Object.fromEntries(bot.inventory.items().map(i => [i.name, (bot.inventory.items().filter(x => x.name === i.name).reduce((n, x) => n + x.count, 0))]))
  const hotbarStart=Number.isInteger(bot.inventory.hotbarStart)?bot.inventory.hotbarStart:36,hotbar=Array.from({length:9},(_,index)=>{const item=bot.inventory.slots[hotbarStart+index];return item?{slot:index,name:item.name,count:item.count,displayName:item.displayName||item.name}:null}),held=bot.heldItem?{slot:Number.isInteger(bot.quickBarSlot)?bot.quickBarSlot:null,name:bot.heldItem.name,count:bot.heldItem.count,displayName:bot.heldItem.displayName||bot.heldItem.name}:null
  return {
    position: { x: Math.floor(p.x), y: Math.floor(p.y), z: Math.floor(p.z) },
    health: bot.health, food: bot.food, oxygen: bot.oxygenLevel,
    dimension: bot.game?.dimension, gameMode: bot.game?.gameMode || bot.game?.gamemode || bot.gameMode || 'unknown', time: bot.time?.timeOfDay,
    inventory, hotbar, selectedHotbarSlot:Number.isInteger(bot.quickBarSlot)?bot.quickBarSlot:null, heldItem:held, nearbyBlocks: vision.nearby, visibleTargets:vision.targets, nearbyEntities:vision.entities,
    vision:{radiusBlocks:radius,serverChunks:bot.game?.serverViewDistance||null},
    equipment: [bot.heldItem, ...(bot.inventory.slots.slice(5, 9))].filter(Boolean).map(i => i.name)
  }
}
