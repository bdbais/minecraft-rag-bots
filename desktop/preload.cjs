const { contextBridge, ipcRenderer } = require('electron')
contextBridge.exposeInMainWorld('botsApi', {
  listConfigs: () => ipcRenderer.invoke('config:list'), saveConfigs: x => ipcRenderer.invoke('config:save', x),
  startAllAtLaunch: ipcRenderer.invoke('app:launch-options').then(x => !!x.startAllBots),
  setSelectedBot: id => ipcRenderer.send('ui:selected-bot', id),
  listBots: () => ipcRenderer.invoke('bot:list'), connect: x => ipcRenderer.invoke('bot:connect', x),
  start: id => ipcRenderer.invoke('bot:start', id), stop: id => ipcRenderer.invoke('bot:stop', id),
  disconnect: id => ipcRenderer.invoke('bot:disconnect', id), prompt: (id, text) => ipcRenderer.invoke('bot:prompt', { id, text }),
  promptAll: text => ipcRenderer.invoke('bot:prompt-all', text),
  createChild: (parentAId, parentBId, options) => ipcRenderer.invoke('bot:create-child', { parentAId, parentBId, options }),
  stopAll: () => ipcRenderer.invoke('bot:stop-all'), startAll: () => ipcRenderer.invoke('bot:start-all'),
  getMap: id => ipcRenderer.invoke('map:get', id),
  ollamaStatus: () => ipcRenderer.invoke('ollama:status'), ollamaStart: () => ipcRenderer.invoke('ollama:start'), ollamaInstall: () => ipcRenderer.invoke('ollama:install'), ollamaSetupModels: () => ipcRenderer.invoke('ollama:setup-models'),
  exportBiography: id => ipcRenderer.invoke('biography:export', id),
  exportBenchmark: id => ipcRenderer.invoke('benchmark:export', id),
  copyTechnicalLog: id => ipcRenderer.invoke('technical-log:copy', id), exportTechnicalLog: id => ipcRenderer.invoke('technical-log:export', id),
  generateEpicBook: id => ipcRenderer.invoke('biography:epic-book', id),
  itemIcons: (names, version) => ipcRenderer.invoke('item:icons', { names, version }),
  showChangelog: () => ipcRenderer.invoke('app:changelog'),
  onUpdateBanner: cb => ipcRenderer.on('app:update-banner', (_, x) => cb(x)),
  onUpdate: cb => ipcRenderer.on('bot:update', (_, x) => cb(x)), onRemoved: cb => ipcRenderer.on('bot:removed', (_, id) => cb(id)), onBookProgress: cb => ipcRenderer.on('book:progress', (_, x) => cb(x)), onOllamaProgress: cb => ipcRenderer.on('ollama:progress',(_,x)=>cb(x)), onOllamaOpen: cb => ipcRenderer.on('ollama:open',()=>cb())
})
