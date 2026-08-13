import test from 'node:test'
import assert from 'node:assert/strict'
import { autonomousProgressionDecision, execute } from '../src/actions.js'

const bot=items=>({inventory:{items:()=>items},game:{gameMode:'survival'},findBlock:()=>null,registry:{blocksByName:{}}})

test('planner collects lava after a bucket is available',()=>{
  const decision=autonomousProgressionDecision(bot([{name:'crafting_table',count:1},{name:'bucket',count:1}]),{health:20,food:20,nearbyEntities:[],nearbyBlocks:['lava']},[])
  assert.equal(decision.action,'collect_fluid')
  assert.equal(decision.args.fluid,'lava')
})

test('planner prefers water when both fluids are visible',()=>{
  const decision=autonomousProgressionDecision(bot([{name:'crafting_table',count:1},{name:'bucket',count:1}]),{health:20,food:20,nearbyEntities:[],nearbyBlocks:['water','lava']},[])
  assert.equal(decision.action,'collect_fluid')
  assert.equal(decision.args.fluid,'water')
})

test('planner builds a Nether portal when obsidian and flint steel are ready',()=>{
  const decision=autonomousProgressionDecision(bot([{name:'crafting_table',count:1},{name:'stone_pickaxe',count:1},{name:'stone_axe',count:1},{name:'chest',count:1},{name:'furnace',count:1},{name:'oak_log',count:2},{name:'cobblestone',count:8},{name:'obsidian',count:10},{name:'flint_and_steel',count:1}]),{health:20,food:20,nearbyEntities:[],nearbyBlocks:[]},[])
  assert.equal(decision.action,'build_portal')
})

test('build_portal places a verified frame and shares its checkpoint',async()=>{
  const placed=new Set(),items=[{name:'obsidian',count:10},{name:'flint_and_steel',count:1}],checkpoints=[]
  const key=p=>`${p.x},${p.y},${p.z}`
  const bot={entity:{position:{floored:()=>({x:0,y:64,z:0})}},inventory:{items:()=>items},blockAt:p=>placed.has(key(p))?{name:'obsidian',boundingBox:'block',position:p}:((p.y===63||p.x<0||p.x>2)?{name:'stone',boundingBox:'block',position:p}:{name:'air',boundingBox:'empty',position:p}),equip:async()=>{},placeBlock:async(base,face)=>{placed.add(`${base.position.x+face.x},${base.position.y+face.y},${base.position.z+face.z}`)},activateBlock:async()=>{}}
  await execute(bot,{action:'build_portal',args:{}},{onShareCheckpoint:async cp=>checkpoints.push(cp)})
  assert.equal(placed.size,10);assert.equal(checkpoints[0].type,'portal')
})
