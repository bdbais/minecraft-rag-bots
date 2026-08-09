import test from 'node:test'
import assert from 'node:assert/strict'
import { basicProgressionDecision, craftItem, execute, normalizeDecision, resolveCraftName } from '../src/actions.js'
import { Vec3 } from 'vec3'

test('crafting table automatically converts a log into planks first', async () => {
  const counts = new Map([[1, 1], [2, 0], [3, 0]])
  const plankRecipe = { result:{ id:2, count:4 }, requiresTable:false, delta:[{id:1,metadata:null,count:-1},{id:2,metadata:null,count:4}] }
  const tableRecipe = { result:{ id:3, count:1 }, requiresTable:false, delta:[{id:2,metadata:null,count:-4},{id:3,metadata:null,count:1}] }
  const recipes = { 2:plankRecipe, 3:tableRecipe }
  const bot = {
    registry:{ itemsByName:{oak_log:{id:1},oak_planks:{id:2},crafting_table:{id:3}}, items:{1:{name:'oak_log'},2:{name:'oak_planks'},3:{name:'crafting_table'}}, blocksByName:{crafting_table:{id:30}} },
    inventory:{ count:(id)=>counts.get(id)||0 }, findBlock:()=>null,
    recipesAll:id=>[recipes[id]].filter(Boolean),
    recipesFor:(id,_meta,wanted)=>{ const r=recipes[id]; return r && r.delta.every(d=>d.count>=0 || (counts.get(d.id)||0)>=Math.abs(d.count)*Math.ceil(wanted/r.result.count)) ? [r] : [] },
    craft:async (r,times)=>{ for(const d of r.delta) counts.set(d.id,(counts.get(d.id)||0)+d.count*times) }
  }
  await craftItem(bot, 'crafting_table', 1)
  assert.equal(counts.get(1), 0); assert.equal(counts.get(2), 0); assert.equal(counts.get(3), 1)
})

test('human aliases craft and place a workbench before making an axe',async()=>{const counts=new Map([[1,4],[2,0],[3,0],[4,0],[5,0]]),recipes={2:{result:{id:2,count:4},requiresTable:false,delta:[{id:1,count:-1},{id:2,count:4}]},3:{result:{id:3,count:1},requiresTable:false,delta:[{id:2,count:-4},{id:3,count:1}]},4:{result:{id:4,count:4},requiresTable:false,delta:[{id:2,count:-2},{id:4,count:4}]},5:{result:{id:5,count:1},requiresTable:true,delta:[{id:2,count:-3},{id:4,count:-2},{id:5,count:1}]}},names={1:'oak_log',2:'oak_planks',3:'crafting_table',4:'stick',5:'wooden_axe'};let placed=false;const bot={registry:{itemsByName:Object.fromEntries(Object.entries(names).map(([id,name])=>[name,{id:Number(id)}])),items:Object.fromEntries(Object.entries(names).map(([id,name])=>[id,{name}])),blocksByName:{crafting_table:{id:30}}},entity:{position:new Vec3(0,64,0)},inventory:{count:id=>counts.get(id)||0,items:()=>[...counts].filter(([,count])=>count>0).map(([id,count])=>({type:id,name:names[id],count}))},findBlock:()=>placed?{name:'crafting_table'}:null,recipesAll:id=>recipes[id]?[recipes[id]]:[],recipesFor:(id,_m,wanted,table)=>{const r=recipes[id];if(!r||r.requiresTable&&!table)return[];const times=Math.ceil(wanted/r.result.count);return r.delta.every(d=>d.count>=0||(counts.get(d.id)||0)>=Math.abs(d.count)*times)?[r]:[]},craft:async(r,times)=>{for(const d of r.delta)counts.set(d.id,(counts.get(d.id)||0)+d.count*times)},equip:async()=>{},blockAt:p=>p.y===63?{name:'stone',boundingBox:'block'}:{name:'air',boundingBox:'empty'},placeBlock:async()=>{counts.set(3,(counts.get(3)||0)-1);placed=true}};const result=await craftItem(bot,'ascia',1);assert.equal(counts.get(5),1);assert.equal(placed,true);assert.match(result,/wooden_axe/);assert.match(result,/banco da lavoro/)})

test('crafting aliases select materials already in inventory',()=>{const bot={inventory:{items:()=>[{name:'birch_log',count:2},{name:'red_wool',count:3},{name:'iron_ingot',count:8}]}};assert.equal(resolveCraftName(bot,'plank'),'birch_planks');assert.equal(resolveCraftName(bot,'workbench'),'crafting_table');assert.equal(resolveCraftName(bot,'contenitore'),'chest');assert.equal(resolveCraftName(bot,'letto'),'red_bed');assert.equal(resolveCraftName(bot,'piccone'),'iron_pickaxe');assert.equal(resolveCraftName(bot,'porta'),'birch_door');assert.equal(resolveCraftName(bot,'scudo'),'shield')})
test('model argument aliases are normalized for collection and crafting',()=>{const collect=normalizeDecision({}, {goal:'collect coal',action:'collect_block',args:{blockType:'coal_ore',quantity:3}});assert.equal(collect.args.name,'coal_ore');assert.equal(collect.args.count,3);const craft=normalizeDecision({}, {goal:'build wooden chest',action:'craft',args:{recipe:'wooden_planks',quantity:6}});assert.equal(craft.args.name,'chest');assert.equal(craft.args.count,6)})
test('basic progression overrides wandering with a real workbench action',()=>{const bot={inventory:{items:()=>[{name:'oak_log',count:2}]},registry:{blocksByName:{crafting_table:{id:1}}},findBlock:()=>null},decision=basicProgressionDecision(bot,'crea un banco di lavoro');assert.equal(decision.action,'craft');assert.equal(decision.args.name,'crafting_table')})
test('collecting a block protects functional workstations unless destruction is explicit',async()=>{let collected=false;const bot={inventory:{items:()=>[]},findBlock:()=>({name:'crafting_table'}),collectBlock:{collect:async()=>{collected=true}}};await assert.rejects(()=>execute(bot,{action:'collect_block',goal:'raccogli materiali',args:{name:'crafting_table'}}),/postazione protetta/);assert.equal(collected,false)})
