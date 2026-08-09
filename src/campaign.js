const count = (items, re) => (items || []).filter(x => re.test(x.name || '')).reduce((n, x) => n + (x.count || 0), 0)
export function campaignState(observation = {}, checkpoints = []) {
  const items = Object.entries(observation.inventory || {}).map(([name, count]) => ({ name, count })), has = name => items.some(x => x.name === name && x.count > 0)
  const logs = count(items, /(_log|_wood|_stem|_hyphae)$/), food = count(items, /bread|beef|porkchop|chicken|mutton|carrot|potato|apple/), iron = count(items, /iron_ingot/), blaze = count(items, /blaze_rod/), pearls = count(items, /ender_pearl/), eyes = count(items, /ender_eye/)
  const hasPortal = checkpoints.some(x => x.type === 'portal' || /portal/i.test(x.label || '')), hasStronghold = checkpoints.some(x => /stronghold|roccaforte|fortezza/i.test(x.label || ''))
  let phase = 'survival', objective = 'raccogli legna, cibo e costruisci un riparo', completion = 0
  if (logs >= 4 && food >= 4) { phase = 'tools'; objective = 'crea banco, utensili, scudo e raccogli ferro'; completion = 15 }
  if (iron >= 3 || has('iron_pickaxe')) { phase = 'nether_prep'; objective = 'prepara secchio, armatura e portale del Nether'; completion = 30 }
  if (hasPortal || blaze > 0) { phase = 'nether'; objective = 'trova una fortezza e raccogli blaze rod e perle di Ender'; completion = 50 }
  if (blaze >= 4 && pearls >= 4) { phase = 'eyes'; objective = 'crea Eyes of Ender e segui la stronghold'; completion = 65 }
  if (eyes >= 4 || hasStronghold) { phase = 'stronghold'; objective = 'localizza la stanza del portale e prepara la spedizione'; completion = 80 }
  if (hasStronghold && (has('bow') || has('diamond_sword') || has('iron_sword'))) { phase = 'end_assault'; objective = 'entra nell’End, distruggi i cristalli e coordina l’attacco al Drago'; completion = 95 }
  return { phase, objective, completion, resources: { logs, food, iron, blaze, pearls, eyes }, nextChecks: ['un’azione deve cambiare inventario, posizione o checkpoint', 'se fallisce due volte cambia strategia e informa la squadra'] }
}
