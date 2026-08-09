import fs from 'node:fs/promises'
import path from 'node:path'

export const checkpointTypes = new Set(['chest','mine','dungeon','monster','resource','danger','base','portal','workstation','other'])
const number = value => Number.isFinite(Number(value)) ? Math.floor(Number(value)) : null

export class TeamCheckpoints {
  constructor(file, server){this.file=file;this.server=server;this.items={};this.loaded=false}
  async load(){if(this.loaded)return;try{const data=JSON.parse(await fs.readFile(this.file,'utf8'));this.items=data.items||{}}catch{}this.loaded=true}
  async save(){await fs.mkdir(path.dirname(this.file),{recursive:true});await fs.writeFile(this.file,JSON.stringify({server:this.server,items:this.items},null,2))}
  list(limit=80){return Object.values(this.items).sort((a,b)=>b.lastSeen.localeCompare(a.lastSeen)).slice(0,limit)}
  async publish(input){await this.load();const x=number(input.x),y=number(input.y),z=number(input.z);if(x===null||y===null||z===null)throw new Error('coordinate checkpoint non valide');const type=checkpointTypes.has(input.type)?input.type:'other',dimension=String(input.dimension||'overworld'),nearby=Object.values(this.items).find(p=>p.type===type&&p.dimension===dimension&&Math.hypot(p.x-x,p.y-y,p.z-z)<=6),id=nearby?.id||crypto.randomUUID(),now=new Date().toISOString(),reporter=String(input.reporter||'bot');this.items[id]={id,type,label:String(input.label||type).slice(0,100),x,y,z,dimension,note:String(input.note||'').slice(0,300),source:String(input.source||'bot'),firstSeen:nearby?.firstSeen||now,lastSeen:now,reporters:[...new Set([...(nearby?.reporters||[]),reporter])].slice(-20)};await this.save();return this.items[id]}
}

export function serverCheckpointFile(dataDir,host,port){const key=Buffer.from(`${String(host).toLowerCase()}:${Number(port)||25565}`).toString('base64url');return path.join(dataDir,`team-checkpoints-${key}.json`)}
