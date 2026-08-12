import fs from 'node:fs/promises'
import path from 'node:path'

const clamp=(value,min=-1,max=1)=>Math.max(min,Math.min(max,Number(value)||0))

/** Persistent lightweight social model used by agents and biographies. */
export class SocialMemory {
  constructor(file){this.file=file;this.people={};this.goals=[]}
  async load(){try{const data=JSON.parse(await fs.readFile(this.file,'utf8'));this.people=data.people||{};this.goals=Array.isArray(data.goals)?data.goals:[]}catch{}return this}
  async save(){await fs.mkdir(path.dirname(this.file),{recursive:true});await fs.writeFile(this.file,JSON.stringify({people:this.people,goals:this.goals},null,2))}
  remember(name,delta={}){if(!name)return null;const key=String(name);const old=this.people[key]||{trust:0,affection:0,respect:0,fear:0,karma:0,encounters:0,memories:[]};const karma=Number.isFinite(Number(delta.karma))?Number(delta.karma):(delta.good?0.08:delta.bad?-0.1:0);const next={...old,trust:clamp(old.trust+(delta.trust||karma*0.5)),affection:clamp(old.affection+(delta.affection||0)),respect:clamp(old.respect+(delta.respect||karma*0.35)),fear:clamp(old.fear+(delta.fear||0)),karma:clamp(old.karma+karma,-100,100),encounters:old.encounters+1};if(delta.memory)next.memories=[...next.memories,String(delta.memory)].slice(-20);this.people[key]=next;return next}
  reward(name,amount=0.1,memory){return this.remember(name,{karma:Math.abs(Number(amount)||0.1),good:true,memory})}
  penalize(name,amount=0.1,memory){return this.remember(name,{karma:-Math.abs(Number(amount)||0.1),bad:true,memory})}
  proposeGoal(title,proposer){if(!title)return null;const existing=this.goals.find(g=>g.title===title&&g.status==='open');if(existing){existing.supporters=[...new Set([...existing.supporters,proposer].filter(Boolean))];return existing}const goal={id:`goal-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,title:String(title),proposer:proposer||'unknown',supporters:proposer?[proposer]:[],status:'open',createdAt:new Date().toISOString()};this.goals.push(goal);this.goals=this.goals.slice(-50);return goal}
  openGoals(){return this.goals.filter(g=>g.status==='open')}
}
