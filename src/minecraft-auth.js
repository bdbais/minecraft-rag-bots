import path from 'node:path'

export function safeBotId(id) {
  return String(id || '').replace(/[^a-z0-9_-]/gi, '_') || 'bot'
}

export function minecraftConnectionOptions(config, dataDir, onMicrosoftCode) {
  const auth = config.auth === 'microsoft' ? 'microsoft' : 'offline'
  const options = {
    host: config.host,
    port: Number(config.port) || 25565,
    username: String(config.username || '').trim(),
    auth,
    version: config.version || undefined
  }
  if (auth === 'microsoft') {
    options.profilesFolder = path.join(dataDir, 'microsoft-auth', safeBotId(config.id))
    options.onMsaCode = data => onMicrosoftCode?.({
      botId: config.id,
      botName: config.name,
      account: options.username,
      userCode: data.user_code,
      verificationUri: data.verification_uri || data.verification_uri_complete || 'https://www.microsoft.com/link',
      verificationUriComplete: data.verification_uri_complete || null,
      expiresIn: data.expires_in || null,
      message: data.message || null
    })
  }
  return options
}
