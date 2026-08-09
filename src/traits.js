const n = value => Math.max(6, Math.min(16, Number(value) || 10))
export function psychProfile(config = {}) {
  const stats={ST:n(config.strength),DX:n(config.dexterity),IQ:n(config.intelligence),HT:n(config.vitality),Will:n(config.willpower),Per:n(config.perception)}
  const fear=config.fear||'none', phobia=String(config.phobia||'').trim(), temperament=config.temperament||'calm'
  const risk=stats.Will+stats.HT>=24?'resolute':stats.Will+stats.HT<=17?'risk-averse':'measured'
  const social=temperament==='protective'?'protect companions':temperament==='solitary'?'prefer independence but exchange useful facts':'cooperate naturally'
  const prompt=`Psychophysical profile (GURPS-like): ST ${stats.ST}, DX ${stats.DX}, IQ ${stats.IQ}, HT ${stats.HT}, Will ${stats.Will}, Per ${stats.Per}. Temperament: ${temperament}; risk response: ${risk}; social tendency: ${social}. Primary fear: ${fear}${phobia?`; personal phobia/trait: ${phobia}`:''}. Express these traits through choices, caution, priorities and short chat reactions. Fear influences behavior but never causes irrational loops: seek light, distance, shelter or a companion, and gradually learn confidence from successful exposure.`
  return {stats,fear,phobia,temperament,risk,prompt}
}
