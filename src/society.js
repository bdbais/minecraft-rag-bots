import fs from 'node:fs/promises'
import path from 'node:path'

// Shared, server-scoped culture. Individual memories remain private; only
// verified milestones and explicit social acts become public knowledge.
export class SocietyStore {
  constructor(file) { this.file=file; this.factions=[]; this.legends=[]; this.rituals=[] }
  async load(){try{const d=JSON.parse(await fs.readFile(this.file,'utf8'));this.factions=Array.isArray(d.factions)?d.factions:[];this.legends=Array.isArray(d.legends)?d.legends:[];this.rituals=Array.isArray(d.rituals)?d.rituals:[]}catch{}return this}
  async save(){await fs.mkdir(path.dirname(this.file),{recursive:true});await fs.writeFile(this.file,JSON.stringify({factions:this.factions.slice(-100),legends:this.legends.slice(-300),rituals:this.rituals.slice(-100)},null,2))}
  createFaction(name, founder, values=[]){if(!name)return null;let f=this.factions.find(x=>x.name.toLowerCase()===String(name).toLowerCase());if(!f){f={id:`faction-${Date.now()}`,name:String(name),founders:founder?[founder]:[],members:founder?[founder]:[],values:[...new Set(values)].slice(0,8),createdAt:new Date().toISOString()};this.factions.push(f)}else if(founder&&!f.members.includes(founder))f.members.push(founder);return f}
  join(faction, member){const f=this.createFaction(faction,member);if(member&&!f.members.includes(member))f.members.push(member);return f}
  legend(title,body,hero,importance=1){if(!title||!body)return null;const item={id:`legend-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,title:String(title),body:String(body),hero:hero||'unknown',importance:Math.max(1,Math.min(5,Number(importance)||1)),at:new Date().toISOString()};this.legends.push(item);return item}
  ritual(text,author){if(!text)return null;const r={text:String(text),author:author||'unknown',at:new Date().toISOString()};this.rituals.push(r);return r}
  context(limit=12){return{factions:this.factions.map(f=>({...f,members:f.members.slice(-20)})),legends:this.legends.slice(-limit),rituals:this.rituals.slice(-limit)}}
}
