// Lightweight fuzzy strategy search. It is deliberately bounded: exploration
// may try alternatives, but never trades health for an unbounded random loop.
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,Number(x)||0))
export function fuzzyScore(candidate, state, failures={}) {
  const inv=state?.inventory||{}, health=Number(state?.health||20), food=Number(state?.food||20)
  const has=(re)=>Object.keys(inv).some(n=>re.test(n)&&Number(inv[n])>0)
  const safe=clamp(Math.min(health/20,food/20)+(/escape|eat|shelter|wait/.test(candidate.action)?0.25:0))
  const prereq=candidate.action==='craft'?clamp(has(/log|plank|stone|iron/)?1:0.2):candidate.action==='equip'?clamp(has(/axe|pickaxe|sword|shield|armor/)?1:0.2):1
  const novelty=clamp(1-(Number(failures[candidate.action])||0)/4)
  return Number((safe*0.45+prereq*0.35+novelty*0.2).toFixed(3))
}
export function exploreStrategies(state, failures={}) {
  const candidates=[
    {action:'collect_drops',args:{maxDistance:8},goal:'raccogliere oggetti vicini'},
    {action:'inspect_storage',args:{maxDistance:8},goal:'controllare una chest vicina'},
    {action:'collect_wood',args:{count:2},goal:'raccogliere legno'},
    {action:'collect_block',args:{name:'stone',count:2,maxDistance:12},goal:'raccogliere pietra'},
    {action:'craft',args:{name:'crafting_table',count:1},goal:'creare un banco di lavoro'},
    {action:'eat',args:{},goal:'recuperare energia'},
    {action:'explore',args:{radius:16},goal:'cercare una nuova area'}
  ].map(x=>({...x,score:fuzzyScore(x,state,failures)})).sort((a,b)=>b.score-a.score)
  return candidates.slice(0,3)
}
