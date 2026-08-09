const GB=1024**3
const vendor = gpu => Number(gpu.vendorId ?? gpu.vendor_id ?? 0)
export function recommendLocalModel({ramBytes=0,cpuModel='',gpus=[]}={}){
  const ramGb=Math.round(ramBytes/GB),vendors=new Set(gpus.map(vendor)),hasNvidia=vendors.has(0x10de),hasAmd=vendors.has(0x1002),intelOnly=vendors.size>0&&[...vendors].every(x=>x===0x8086)
  if(ramGb&&ramGb<=8)return{tier:'minimo',baseModel:'qwen3:0.6b',fallbackModel:'qwen3:0.6b',reason:'RAM disponibile limitata'}
  if(intelOnly||(!hasNvidia&&!hasAmd&&/Intel.*(?:U|Mobile)/i.test(cpuModel)))return{tier:'leggero',baseModel:'qwen3:1.7b',fallbackModel:'qwen3:0.6b',reason:'grafica Intel integrata o inferenza prevalentemente CPU'}
  if(hasNvidia||hasAmd)return{tier:ramGb>=48?'qualità':'bilanciato',baseModel:ramGb>=48?'gemma3:4b':'llama3.2:3b',fallbackModel:'qwen3:1.7b',reason:'GPU discreta rilevata'}
  return{tier:'leggero',baseModel:'qwen3:1.7b',fallbackModel:'qwen3:0.6b',reason:'accelerazione GPU dedicata non rilevata'}
}
