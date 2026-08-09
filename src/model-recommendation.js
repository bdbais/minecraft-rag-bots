const GB=1024**3
const vendor = gpu => Number(gpu.vendorId ?? gpu.vendor_id ?? 0)
export function hardwareDna({ramBytes=0,cpuModel='',logicalCpuCount=0,gpus=[]}={}){
  const ramGb=Math.max(0,Number(ramBytes)/GB), gpuCount=gpus.length, gpuNames=gpus.map(g=>g.description||g.name||String(g.vendorId||'')), cpu=String(cpuModel||'unknown')
  const score=Math.max(1,Math.min(100,Math.round(Math.min(ramGb/64,1)*35+Math.min(Number(logicalCpuCount||0)/16,1)*25+(gpuCount?30:8)+(gpus.some(g=>[0x10de,0x1002].includes(vendor(g)))?10:0))))
  const tier=score>=75?'alpha':score>=50?'beta':score>=30?'gamma':'delta'
  return {version:1,score,tier,genes:{ramGb:Math.round(ramGb*10)/10,logicalCpuCount:Number(logicalCpuCount)||0,gpuCount,gpuNames,cpuModel:cpu},label:`${tier}-${score}`}
}
export function recommendLocalModel({ramBytes=0,cpuModel='',gpus=[]}={}){
  const ramGb=Math.round(ramBytes/GB),vendors=new Set(gpus.map(vendor)),hasNvidia=vendors.has(0x10de),hasAmd=vendors.has(0x1002),intelOnly=vendors.size>0&&[...vendors].every(x=>x===0x8086)
  if(ramGb&&ramGb<=8)return{tier:'minimo',baseModel:'qwen3:0.6b',fallbackModel:'qwen3:0.6b',reason:'RAM disponibile limitata'}
  if(intelOnly||(!hasNvidia&&!hasAmd&&/Intel.*(?:U|Mobile)/i.test(cpuModel)))return{tier:'leggero',baseModel:'qwen3:1.7b',fallbackModel:'qwen3:0.6b',reason:'grafica Intel integrata o inferenza prevalentemente CPU'}
  if(hasNvidia||hasAmd)return{tier:ramGb>=48?'qualità':'bilanciato',baseModel:ramGb>=48?'gemma3:4b':'llama3.2:3b',fallbackModel:'qwen3:1.7b',reason:'GPU discreta rilevata'}
  return{tier:'leggero',baseModel:'qwen3:1.7b',fallbackModel:'qwen3:0.6b',reason:'accelerazione GPU dedicata non rilevata'}
}
