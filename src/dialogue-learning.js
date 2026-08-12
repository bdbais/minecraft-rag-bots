import fs from 'node:fs/promises'
import path from 'node:path'

const clamp=(x,a=-1,b=1)=>Math.max(a,Math.min(b,Number(x)||0))
export class DialogueLearning {
  constructor(file, personality='balanced'){this.file=file;this.personality=personality;this.stats={turns:0,useful:0,collaborative:0,conflicts:0};this.examples=[];this.style={warmth:0,detail:0,assertiveness:0}}
  async load(){try{const d=JSON.parse(await fs.readFile(this.file,'utf8'));Object.assign(this,d)}catch{}return this}
  async save(){await fs.mkdir(path.dirname(this.file),{recursive:true});await fs.writeFile(this.file,JSON.stringify({personality:this.personality,stats:this.stats,style:this.style,examples:this.examples.slice(-100)},null,2))}
  observe({incoming='',reply='',addressed=false,karma=0,goal=false}){const text=`${incoming} ${reply}`.toLowerCase();this.stats.turns++;const useful=goal||/aiut|insieme|posso|obiettivo|material|pericolo|grazie/.test(text);if(useful)this.stats.useful++;if(/collabor|insieme|conseg|aiut/.test(text))this.stats.collaborative++;if(karma<0)this.stats.conflicts++;this.style.warmth=clamp(this.style.warmth+(karma>0?.04:karma<0?-.03:0));if(useful)this.style.detail=clamp(this.style.detail+.02);if(/no|stop|pericolo/.test(incoming.toLowerCase()))this.style.assertiveness=clamp(this.style.assertiveness+.01);this.examples.push({incoming:String(incoming).slice(0,300),reply:String(reply).slice(0,300),useful,karma,at:new Date().toISOString()});this.examples=this.examples.slice(-100);return{useful,style:this.style}}
  prompt(){return`Dialogue profile: personality=${this.personality}; turns=${this.stats.turns}; useful=${this.stats.useful}; collaboration=${this.stats.collaborative}; conflicts=${this.stats.conflicts}; warmth=${this.style.warmth.toFixed(2)} detail=${this.style.detail.toFixed(2)} assertiveness=${this.style.assertiveness.toFixed(2)}. Keep replies brief, contextual and consistent; acknowledge goals, ask one useful question, and propose concrete cooperation.`}
}
