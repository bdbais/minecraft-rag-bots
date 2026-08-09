export function compareVersions(a, b) {
  const left = String(a).replace(/^v/, '').split('.').map(x => Number.parseInt(x, 10) || 0)
  const right = String(b).replace(/^v/, '').split('.').map(x => Number.parseInt(x, 10) || 0)
  for (let i = 0; i < Math.max(left.length, right.length); i++) { const delta = (left[i] || 0) - (right[i] || 0); if (delta) return Math.sign(delta) }
  return 0
}

export async function checkForUpdates(currentVersion, repo, request = fetch) {
  const response = await request(`https://api.github.com/repos/${repo}/releases/latest`, { headers: { accept: 'application/vnd.github+json', 'user-agent': 'Minecraft-RAG-Bots' } })
  if (response.status === 404) return { status: 'unavailable', currentVersion, message: 'Il repository o una release pubblica non sono ancora disponibili.' }
  if (!response.ok) throw new Error(`GitHub ${response.status}`)
  const release = await response.json(), latestVersion = String(release.tag_name || '').replace(/^v/, '')
  if (!latestVersion) throw new Error('La release non contiene una versione valida')
  return { status: compareVersions(latestVersion, currentVersion) > 0 ? 'available' : 'current', currentVersion, latestVersion, url: release.html_url }
}
