import fs from 'node:fs/promises'
import path from 'node:path'

/** Shared, evidence-weighted skill library for all bot instances. */
export class SharedLearningLibrary {
  constructor(file){this.file=file;this.lessons=[]}
  async load(){try{const data=JSON.parse(await fs.readFile(this.file,'utf8'));this.lessons=Array.isArray(data.lessons)?data.lessons:[]}catch{}return this}
  async save(){await fs.mkdir(path.dirname(this.file),{recursive:true});await fs.writeFile(this.file,JSON.stringify({lessons:this.lessons.slice(-500)},null,2))}
  async record(lesson){if(!lesson?.text||Number(lesson.confidence||0)<0.7)return null;const key=`${lesson.action||''}|${lesson.text}`;const old=this.lessons.find(x=>x.key===key);if(old){old.uses++;old.successes+=(lesson.success?1:0);old.confidence=Math.min(1,Math.max(old.confidence,Number(lesson.confidence)||0));old.updatedAt=new Date().toISOString()}else this.lessons.push({key,text:String(lesson.text),action:lesson.action||'unknown',confidence:Number(lesson.confidence)||0.7,uses:1,successes:lesson.success?1:0,source:lesson.source||'bot',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});await this.save();return this.lessons.at(-1)}
  best(limit=40){return [...this.lessons].sort((a,b)=>(b.confidence*b.successes+1)-(a.confidence*a.successes+1)).slice(0,limit)}
}
