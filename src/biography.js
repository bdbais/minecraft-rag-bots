import fs from 'node:fs/promises'
import path from 'node:path'

const importantItems = new Set(['crafting_table','wooden_pickaxe','stone_pickaxe','iron_pickaxe','diamond_pickaxe','shield','iron_sword','diamond_sword','iron_ingot','diamond','obsidian','flint_and_steel','blaze_rod','ender_pearl','ender_eye','dragon_egg'])

export function recoverBiographyText(text) {
  const marker=/"events"\s*:\s*\[/.exec(text)
  if(!marker)throw new Error('Sezione events non trovata nel diario danneggiato')
  const base=JSON.parse(`${text.slice(0,marker.index)}"events":[]}`),events=[]
  let start=-1,depth=0,string=false,escape=false
  for(let i=marker.index+marker[0].length;i<text.length;i++){
    const c=text[i]
    if(string){if(escape)escape=false;else if(c==='\\')escape=true;else if(c==='"')string=false;continue}
    if(c==='"'){string=true;continue}
    if(c==='{'){if(depth===0)start=i;depth++}
    else if(c==='}'&&depth>0){depth--;if(depth===0&&start>=0){try{events.push(JSON.parse(text.slice(start,i+1)))}catch{break}start=-1}}
  }
  if(!events.length)throw new Error('Nessun evento completo recuperabile')
  return {...base,events,recovered:true,discardedPartialEvent:depth>0}
}

export class Biography {
  constructor(file, identity, context = {}) { this.file = file; this.identity = identity; this.context=context;this.events = []; this.sessions = []; this.milestones = {}; this.sessionId = null;this.saveChain=Promise.resolve() }
  async load() { try { const text=await fs.readFile(this.file,'utf8');let x;try{x=JSON.parse(text)}catch(error){x=recoverBiographyText(text);const stamp=new Date().toISOString().replace(/[:.]/g,'-');await fs.copyFile(this.file,`${this.file}.corrupt-${stamp}.bak`);this.events=x.events||[];this.sessions=x.sessions||[];this.milestones=x.milestones||{};this.events.push({id:crypto.randomUUID(),at:new Date().toISOString(),sessionId:null,type:'recovery',title:'La cronaca ritrovata',text:`Il diario danneggiato è stato recuperato: ${x.events.length} eventi integri sono stati preservati${x.discardedPartialEvent?' e un evento incompleto è stato scartato':''}.`,weather:null,data:{automatic:true}});await this.save();return}this.events=x.events||[];this.sessions=x.sessions||[];this.milestones=x.milestones||{} } catch (e) { if (e.code !== 'ENOENT') throw e } }
  async save() { const content=JSON.stringify({ identity: this.identity, milestones: this.milestones, sessions: this.sessions, events: this.events }, null, 2),file=this.file;this.saveChain=this.saveChain.catch(()=>{}).then(async()=>{await fs.mkdir(path.dirname(file),{recursive:true});const temp=`${file}.${process.pid}.${crypto.randomUUID()}.tmp`;await fs.writeFile(temp,content);await fs.rename(temp,file)});return this.saveChain }
  async add(type, title, text, data = {}) { let weather=null;try{weather=this.context.weather?.()||null}catch{}const event = { id: crypto.randomUUID(), at: new Date().toISOString(), sessionId: this.sessionId, type, title, text, weather, data }; this.events.push(event); await this.save(); return event }
  async startSession(server, personality) { this.sessionId = crypto.randomUUID(); this.sessions.push({ id: this.sessionId, startedAt: new Date().toISOString(), server, personality }); return this.add('session', 'Un nuovo capitolo', `${this.identity.name} è entrato nel mondo su ${server} con personalità ${personality}.`) }
  async endSession(reason) { const session = this.sessions.find(x => x.id === this.sessionId); if (session) { session.endedAt = new Date().toISOString(); session.reason = reason }; await this.add('session', 'Fine della sessione', `${this.identity.name} ha lasciato il mondo: ${reason}.`); this.sessionId = null; await this.save() }
  async observeMilestones(delta) { for (const change of delta?.inventory || []) { const match = change.match(/^(.+) \+(\d+)$/); if (!match || !importantItems.has(match[1]) || this.milestones[match[1]]) continue; this.milestones[match[1]] = new Date().toISOString(); await this.add('milestone', 'Una conquista importante', `${this.identity.name} ha ottenuto per la prima volta ${match[1].replaceAll('_', ' ')}.`) }; if (delta?.dimensionChanged) await this.add('milestone', 'Oltre il confine', `${this.identity.name} ha raggiunto una nuova dimensione.`) }
  recent(limit = 30) { return this.events.slice(-limit).reverse() }
  toMarkdown() { const lines = [`# Biografia di ${this.identity.name}`, '', `- Username: ${this.identity.username}`, `- Identità: ${this.identity.gender || 'neutral'}`, `- Eventi registrati: ${this.events.length}`, `- Sessioni: ${this.sessions.length}`, '', '## Cronologia', '']; for (const event of this.events) lines.push(`### ${new Date(event.at).toLocaleString('it-IT')} — ${event.title}`, '', event.weather?`*Meteo: ${event.weather.icon} ${event.weather.label}${event.weather.biome?` · Bioma: ${event.weather.biome.replaceAll('_',' ')}`:''}*`:null,event.text,''); return lines.filter(x=>x!==null).join('\n') }
}
