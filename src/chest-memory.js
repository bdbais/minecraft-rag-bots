import fs from 'node:fs/promises'
export class ChestMemory {
  constructor(file){this.file=file;this.entries={}}
  async load(){try{this.entries=JSON.parse(await fs.readFile(this.file,'utf8'))}catch{this.entries={}}}
  key(p){return `${Math.floor(p.x)},${Math.floor(p.y)},${Math.floor(p.z)}`}
  async save(){await fs.writeFile(this.file,JSON.stringify(this.entries,null,2))}
  async discover(bot){
    const positions=bot.findBlocks({matching:b=>/^(chest|trapped_chest|barrel)$/.test(b?.name||''),maxDistance:48,count:40})
    let changed=false;for(const p of positions){const key=this.key(p);if(!this.entries[key]){this.entries[key]={x:Math.floor(p.x),y:Math.floor(p.y),z:Math.floor(p.z),type:bot.blockAt(p)?.name||'chest',seenAt:new Date().toISOString(),contents:null};changed=true}}
    if(changed)await this.save();return this.list()
  }
  async record(position,contents,type='chest'){const key=this.key(position);this.entries[key]={x:Math.floor(position.x),y:Math.floor(position.y),z:Math.floor(position.z),type,seenAt:new Date().toISOString(),contents};await this.save();return this.entries[key]}
  list(){return Object.values(this.entries).sort((a,b)=>String(b.seenAt).localeCompare(String(a.seenAt))).slice(0,50)}
}
