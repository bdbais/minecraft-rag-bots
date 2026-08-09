export function weatherSnapshot(bot){
  let biome=null;try{biome=bot.blockAt(bot.entity.position.offset(0,-1,0))?.biome||null}catch{}
  const dimension=String(bot.game?.dimension||''),dayTime=Number(bot.time?.timeOfDay)||0,rain=Number(bot.rainState)||0,thunder=Number(bot.thunderState)||0,temperature=biome?.temperature==null?NaN:Number(biome.temperature)
  const snowy=Number.isFinite(temperature)&&temperature<=0.15||/snow|frozen|ice|grove|peak/i.test(biome?.name||'')
  let kind='clear',label=dayTime>=0&&dayTime<12000?'Sole':'Notte serena',icon=dayTime>=0&&dayTime<12000?'☀':'☾'
  if(!/nether|end/i.test(dimension)&&thunder>0.05){kind=snowy?'snow_thunder':'thunder';label=snowy?'Temporale nevoso':'Temporale e tuoni';icon='⛈'}
  else if(!/nether|end/i.test(dimension)&&(bot.isRaining||rain>0.05)){kind=snowy?'snow':'rain';label=snowy?'Neve':'Pioggia';icon=snowy?'❄':'☂'}
  return{kind,label,icon,rainLevel:Math.round(rain*100),thunderLevel:Math.round(thunder*100),biome:biome?.name||null,temperature:Number.isFinite(temperature)?temperature:null,dayTime,dimension:dimension||null}
}
