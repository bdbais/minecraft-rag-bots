export function createExportPackage({ configs, dataFiles, selectedId = null, appVersion }) {
  const selected = selectedId ? configs.filter(x => x.id === selectedId) : configs
  if (selectedId && !selected.length) throw new Error('Bot selezionato non trovato')
  const ids = new Set(selected.map(x => x.id))
  const teamFiles = new Set(selected.filter(x=>x.host).map(x => `team-checkpoints-${Buffer.from(`${String(x.host).toLowerCase()}:${Number(x.port)||25565}`).toString('base64url')}.json`))
  const data = Object.fromEntries(Object.entries(dataFiles).filter(([name]) => teamFiles.has(name) || [...ids].some(id => name === `skills-${id}.json` || name === `biography-${id}.json` || name === `chests-${id}.json` || name === `performance-${id}.json` || name === `world-map-${id}.json` || name === `lifetime-${id}.json` || name === `startup-${id}.json` || name === `technical-log-${id}.jsonl` || name.startsWith(`memory-${id}`))))
  return {
    format: 'minecraft-rag-bots-export', formatVersion: 1,
    type: selectedId ? 'single-bot' : 'complete-configuration',
    exportedAt: new Date().toISOString(), appVersion,
    security: { apiKeysIncluded: false, note: 'Le API key cloud non vengono mai esportate.' },
    configs: selected.map(({ cloudApiKey, hasCloudApiKey, ...safe }) => ({ ...safe, requiresCloudApiKey: safe.aiProvider === 'cloud' })),
    data
  }
}
