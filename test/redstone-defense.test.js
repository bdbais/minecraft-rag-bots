import test from 'node:test'
import assert from 'node:assert/strict'
import { autonomousProgressionDecision, execute } from '../src/actions.js'

test('planner places redstone defense after crafting its components', () => {
  const bot={inventory:{items:()=>[{name:'crafting_table',count:1},{name:'redstone_torch',count:1},{name:'lever',count:1}]},game:{gameMode:'survival'},findBlock:()=>null,registry:{blocksByName:{crafting_table:{id:1}}}}
  const decision=autonomousProgressionDecision(bot,{health:20,food:20,nearbyEntities:[],nearbyBlocks:[]},[{type:'base',label:'Riparo'}])
  assert.equal(decision.action,'build_redstone_defense')
})

test('redstone defense places a torch and a trigger without breaking blocks', async () => {
  const placed=[]
  const blocks=new Map();const bot={entity:{position:{floored:()=>({x:0,y:64,z:0})}},inventory:{items:()=>[{name:'redstone_torch',count:1,type:1},{name:'lever',count:1,type:2}]},equip:async()=>{},blockAt:p=>{const k=`${p.x},${p.y},${p.z}`;return blocks.get(k)||(p.y===63?{name:'stone',boundingBox:'block',position:p}:{name:'air',boundingBox:'empty',position:p})},placeBlock:async(base,face)=>{placed.push(base.name);const p=base.position;blocks.set(`${p.x},${p.y+1},${p.z}`,{name:placed.length===1?'redstone_torch':'lever',boundingBox:'block',position:{x:p.x,y:p.y+1,z:p.z}})},}
  const result=await execute(bot,{action:'build_redstone_defense',args:{}},{onShareCheckpoint:async()=>{}})
  assert.match(result,/difesa redstone/);assert.equal(placed.length,2)
})
