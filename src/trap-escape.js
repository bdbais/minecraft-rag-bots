export function trapEscapeDecision(instruction='') {
  const text=String(instruction).toLowerCase()
  if(!/liber|trappol|bloccato|intrappolat|pareti|muro|fuga/.test(text)) return null
  return {thought:'Emergenza: istruzione di fuga da una trappola.',goal:'scavare un passaggio di fuga nella parete',action:'dig_escape',args:{},expected:'uscire dalla trappola attraverso un passaggio verificato'}
}
