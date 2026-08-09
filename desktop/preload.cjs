const { contextBridge, ipcRenderer } = require('electron')
contextBridge.exposeInMainWorld('botsApi', {
  listConfigs: () => ipcRenderer.invoke('config:list'), saveConfigs: x => ipcRenderer.invoke('config:save', x),
  setSelectedBot: id => ipcRenderer.send('ui:selected-bot', id),
  listBots: () => ipcRenderer.invoke('bot:list'), connect: x => ipcRenderer.invoke('bot:connect', x),
  start: id => ipcRenderer.invoke('bot:start', id), stop: id => ipcRenderer.invoke('bot:stop', id),
  disconnect: id => ipcRenderer.invoke('bot:disconnect', id), prompt: (id, text) => ipcRenderer.invoke('bot:prompt', { id, text }),
  promptAll: text => ipcRenderer.invoke('bot:prompt-all', text),
  stopAll: () => ipcRenderer.invoke('bot:stop-all'),
  getMap: id => ipcRenderer.invoke('map:get', id),
  ollamaStatus: () => ipcRenderer.invoke('ollama:status'), ollamaStart: () => ipcRenderer.invoke('ollama:start'), ollamaInstall: () => ipcRenderer.invoke('ollama:install'), ollamaSetupModels: () => ipcRenderer.invoke('ollama:setup-models'),
  exportBiography: id => ipcRenderer.invoke('biography:export', id),
  exportBenchmark: id => ipcRenderer.invoke('benchmark:export', id),
  copyTechnicalLog: id => ipcRenderer.invoke('technical-log:copy', id), exportTechnicalLog: id => ipcRenderer.invoke('technical-log:export', id),
  generateEpicBook: id => ipcRenderer.invoke('biography:epic-book', id),
  itemIcons: (names, version) => ipcRenderer.invoke('item:icons', { names, version }),
  onUpdate: cb => ipcRenderer.on('bot:update', (_, x) => cb(x)), onRemoved: cb => ipcRenderer.on('bot:removed', (_, id) => cb(id)), onBookProgress: cb => ipcRenderer.on('book:progress', (_, x) => cb(x)), onOllamaProgress: cb => ipcRenderer.on('ollama:progress',(_,x)=>cb(x)), onOllamaOpen: cb => ipcRenderer.on('ollama:open',()=>cb())
})
