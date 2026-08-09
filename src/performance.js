import fs from 'node:fs/promises'
import path from 'node:path'

export const BENCHMARK_VERSION='MBPI-1'
export function calculatePerformance(samples=[],milestones=0){
  const attempts=samples.length,successes=samples.filter(x=>x.success).length,failures=attempts-successes
  const elapsedMs=attempts>1?Math.max(1,new Date(samples.at(-1).at)-new Date(samples[0].at)):0
  const average=(key)=>attempts?Math.round(samples.reduce((n,x)=>n+(Number(x[key])||0),0)/attempts):0
  const successRate=attempts?successes/attempts:0,smoothedQuality=(successes+1)/(attempts+2)
  const actionsPerMinute=elapsedMs?attempts/(elapsedMs/60000):0
  const quality=smoothedQuality,throughput=Math.min(1,actionsPerMinute/6),progress=Math.min(1,milestones/12),stability=attempts?1-Math.min(1,failures/attempts):0,confidence=Math.min(1,attempts/20)
  const score=Math.round(1000*(quality*.55+throughput*.25+progress*.15+stability*.05)*confidence)
  return{version:BENCHMARK_VERSION,score,provisional:attempts<20,confidence:Math.round(confidence*100),attempts,successes,failures,successRate:Math.round(successRate*1000)/10,actionsPerMinute:Math.round(actionsPerMinute*100)/100,milestones,averageCycleMs:average('totalMs'),averagePlanningMs:average('planningMs'),averageActionMs:average('actionMs')}
}
export class PerformanceTracker{
  constructor(file){this.file=file;this.samples=[]}
  async load(){try{this.samples=JSON.parse(await fs.readFile(this.file,'utf8'));if(!Array.isArray(this.samples))this.samples=[]}catch{this.samples=[]}}
  async record(sample){this.samples.push({at:new Date().toISOString(),success:!!sample.success,totalMs:Number(sample.totalMs)||0,planningMs:Number(sample.planningMs)||0,actionMs:Number(sample.actionMs)||0});if(this.samples.length>10000)this.samples.splice(0,this.samples.length-10000);await fs.mkdir(path.dirname(this.file),{recursive:true});await fs.writeFile(this.file,JSON.stringify(this.samples,null,2))}
  summary(milestones=0){return calculatePerformance(this.samples,milestones)}
}
