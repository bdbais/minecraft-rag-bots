import fs from 'node:fs/promises'
import path from 'node:path'

const clamp=(v,min=6,max=16)=>Math.max(min,Math.min(max,Math.round(Number(v)||10)))
export class LineageStore {
  constructor(file){this.file=file;this.generations=[]}
  async load(){try{const x=JSON.parse(await fs.readFile(this.file,'utf8'));this.generations=x.generations||[]}catch{}return this}
  async save(){await fs.mkdir(path.dirname(this.file),{recursive:true});await fs.writeFile(this.file,JSON.stringify({generations:this.generations},null,2))}
  conceive(a,b,{name=`Figlio di ${a.name} e ${b.name}`,gender='neutral'}={}){const stats={};for(const key of ['strength','dexterity','intelligence','vitality','willpower','perception'])stats[key]=clamp(((Number(a[key])||10)+(Number(b[key])||10))/2+(Math.random()<.5?-1:1));const child={id:crypto.randomUUID(),name,gender,parents:[a.id||a.name,b.id||b.name],stats,personality:Math.random()<.5?a.personality:b.personality,createdAt:new Date().toISOString()};this.generations.push(child);return child}
}
