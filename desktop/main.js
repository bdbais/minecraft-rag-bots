import { app, BrowserWindow, ipcMain, shell, dialog, safeStorage, Menu, clipboard } from 'electron'
import path from 'node:path'
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { spawn, execFile } from 'node:child_process'
import { promisify } from 'node:util'
import os from 'node:os'
import { BotManager } from '../src/bot-manager.js'
import { checkForUpdates } from '../src/update-checker.js'
import { createExportPackage } from '../src/export-package.js'
import { queryOllama } from '../src/ollama-setup.js'

// Alcuni driver Intel/VM terminano Electron prima del caricamento della UI.
// Il dashboard non richiede accelerazione 3D: usa il renderer software come fallback.
app.commandLine.appendSwitch('disable-gpu')
app.commandLine.appendSwitch('disable-gpu-compositing')
app.commandLine.appendSwitch('in-process-gpu')
app.disableHardwareAcceleration()
import { recommendLocalModel, hardwareDna } from '../src/model-recommendation.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const minecraftAssets = require('minecraft-assets')
const assetCache = new Map()
const execFileAsync = promisify(execFile)
let win, manager, selectedBotId = null
const AUTHOR = 'bd_ba'
const GITHUB_REPO = 'bd-ba/minecraft-rag-bots'
const GITHUB_URL = `https://github.com/${GITHUB_REPO}`
const configFile = () => path.join(app.getPath('userData'), 'bots.json')
const secretsFile = () => path.join(app.getPath('userData'), 'secrets.json')
const ollamaModelVersionFile = () => path.join(app.getPath('userData'), 'ollama-model-version.txt')
const ollamaSelectionFile = () => path.join(app.getPath('userData'), 'ollama-model-selection.json')
const bundledModelfile = () => path.join(app.getAppPath(), 'Modelfile')
async function findOllamaCli() {
  const candidates=process.platform==='win32'?['ollama.exe',path.join(process.env.LOCALAPPDATA||'','Programs','Ollama','ollama.exe'),path.join(process.env.ProgramFiles||'','Ollama','ollama.exe')]:['ollama','/usr/local/bin/ollama','/usr/bin/ollama','/opt/homebrew/bin/ollama','/Applications/Ollama.app/Contents/Resources/ollama']
  for(const candidate of candidates){try{await execFileAsync(candidate,['--version'],{windowsHide:true,timeout:5000});return candidate}catch{}}
  return null
}
async function modelRecommendation(){let gpu={};try{gpu=await app.getGPUInfo('basic')}catch{}const hardware={ramBytes:os.totalmem(),cpuModel:os.cpus()[0]?.model||'',logicalCpuCount:os.cpus().length,gpus:gpu.gpuDevice||[]};return {...recommendLocalModel(hardware),hardwareDna:hardwareDna(hardware)}}
async function ollamaStatus(){const status=await queryOllama();let installedDefinition='',selection=null;try{installedDefinition=(await fs.readFile(ollamaModelVersionFile(),'utf8')).trim()}catch{}try{selection=JSON.parse(await fs.readFile(ollamaSelectionFile(),'utf8'))}catch{}const baseModelCurrent=installedDefinition===app.getVersion(),recommendation=await modelRecommendation();return{...status,ready:status.ready&&baseModelCurrent,baseModelCurrent,recommendation,selection,installed:!!(await findOllamaCli()),platform:process.platform}}
async function startOllama(){const cli=await findOllamaCli();if(!cli)throw new Error('Ollama non è installato');if(process.platform==='darwin'&&cli.includes('.app'))spawn('open',['-a','Ollama'],{detached:true,stdio:'ignore'}).unref();else spawn(cli,['serve'],{detached:true,stdio:'ignore',windowsHide:true}).unref();for(let i=0;i<15;i++){await new Promise(r=>setTimeout(r,1000));const status=await queryOllama();if(status.running)return status}throw new Error('Ollama è installato ma il servizio non risponde. Avvialo manualmente e riprova.')}
async function installOllama(){if(process.platform!=='win32'){await shell.openExternal('https://ollama.com/download');return{external:true}}send('ollama:progress',{message:'Installazione di Ollama tramite Windows…',percent:5});try{await execFileAsync('winget.exe',['install','--id','Ollama.Ollama','--exact','--accept-package-agreements','--accept-source-agreements'],{windowsHide:true,timeout:15*60*1000,maxBuffer:10*1024*1024});return{installed:true}}catch(error){await shell.openExternal('https://ollama.com/download/windows');throw new Error(`Installazione automatica non completata. Ho aperto il download ufficiale. ${error.message}`)}}
function runOllamaCommand(cli,args,message,percent){return new Promise((resolve,reject)=>{send('ollama:progress',{message,percent});const child=spawn(cli,args,{windowsHide:true});let tail='';child.stdout.on('data',x=>{tail=(tail+x).slice(-1000);send('ollama:progress',{message:`${message} ${String(x).trim().slice(-100)}`,percent})});child.stderr.on('data',x=>{tail=(tail+x).slice(-1000)});child.on('error',reject);child.on('close',code=>code===0?resolve():reject(new Error(`${message} non riuscita: ${tail.trim()||`codice ${code}`}`)))})}
async function benchmarkOllamaModel(model){const started=Date.now(),response=await fetch('http://localhost:11434/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model,stream:false,think:false,format:'json',options:{temperature:0,num_predict:24},messages:[{role:'user',content:'Reply only with JSON: {"ready":true}'}]}),signal:AbortSignal.timeout(45000)});if(!response.ok)throw new Error(await response.text());await response.json();return Date.now()-started}
async function setupOllamaModels(){const cli=await findOllamaCli();if(!cli)throw new Error('Installa prima Ollama');let status=await queryOllama();if(!status.running){await startOllama();status=await queryOllama()}const recommendation=await modelRecommendation(),installed=new Set(status.models.map(x=>x.replace(/:latest$/,'')));if(!installed.has(recommendation.baseModel))await runOllamaCommand(cli,['pull',recommendation.baseModel],`Scaricamento modello ${recommendation.baseModel} (${recommendation.tier})…`,20);if(!installed.has(recommendation.fallbackModel))await runOllamaCommand(cli,['pull',recommendation.fallbackModel],`Scaricamento modello di emergenza ${recommendation.fallbackModel}…`,40);if(!status.hasEmbeddingModel)await runOllamaCommand(cli,['pull','nomic-embed-text'],'Scaricamento del modello per la memoria RAG…',60);const template=await fs.readFile(bundledModelfile(),'utf8'),modelFile=path.join(app.getPath('userData'),'minecraft-agent.Modelfile'),liteFile=path.join(app.getPath('userData'),'minecraft-agent-lite.Modelfile'),render=base=>template.replace(/^FROM .+$/m,`FROM ${base}`);await fs.writeFile(modelFile,render(recommendation.baseModel));await fs.writeFile(liteFile,render(recommendation.fallbackModel).replace('PARAMETER num_ctx 8192','PARAMETER num_ctx 4096'));await runOllamaCommand(cli,['create','minecraft-agent','-f',modelFile],`Creazione minecraft-agent da ${recommendation.baseModel}…`,75);await runOllamaCommand(cli,['create','minecraft-agent-lite','-f',liteFile],'Creazione modello di emergenza minecraft-agent-lite…',85);send('ollama:progress',{message:'Prova reale delle prestazioni del modello…',percent:92});let benchmarkMs=Infinity,degraded=false,selectedBase=recommendation.baseModel;try{benchmarkMs=await benchmarkOllamaModel('minecraft-agent')}catch{}if(benchmarkMs>20000&&recommendation.baseModel!==recommendation.fallbackModel){degraded=true;selectedBase=recommendation.fallbackModel;await fs.writeFile(modelFile,render(selectedBase).replace('PARAMETER num_ctx 8192','PARAMETER num_ctx 4096'));await runOllamaCommand(cli,['create','minecraft-agent','-f',modelFile],'Il test è lento: applicazione automatica del modello leggero…',96);try{benchmarkMs=await benchmarkOllamaModel('minecraft-agent')}catch{}}await fs.writeFile(ollamaSelectionFile(),JSON.stringify({version:app.getVersion(),recommendedBase:recommendation.baseModel,selectedBase,benchmarkMs:Number.isFinite(benchmarkMs)?benchmarkMs:null,degraded,reason:degraded?'test iniziale oltre 20 secondi':recommendation.reason},null,2));await fs.writeFile(ollamaModelVersionFile(),app.getVersion());const final=await ollamaStatus();send('ollama:progress',{message:'Configurazione Ollama completata.',percent:100});return final}
async function readConfigs() { try { return JSON.parse(await fs.readFile(configFile(), 'utf8')) } catch { return [] } }
async function readSecrets() { try { return JSON.parse(await fs.readFile(secretsFile(), 'utf8')) } catch { return {} } }
async function writeSecrets(items) { await fs.mkdir(app.getPath('userData'), { recursive: true }); await fs.writeFile(secretsFile(), JSON.stringify(items, null, 2)) }
async function getApiKey(id) { const secrets = await readSecrets(), encoded = secrets[id]; if (!encoded) return ''; if (!safeStorage.isEncryptionAvailable()) throw new Error('Cifratura credenziali non disponibile sul sistema'); return safeStorage.decryptString(Buffer.from(encoded, 'base64')) }
function lifetimeSummary(raw={}){return{totalPlayMs:raw.totalPlayMs||0,totalPlaySeconds:Math.floor((raw.totalPlayMs||0)/1000),distanceMeters:raw.distanceMeters||0,distanceKm:Math.round(raw.distanceMeters||0)/1000,playersEncountered:Object.keys(raw.playersEncountered||{}).length,botsEncountered:Object.keys(raw.botsEncountered||{}).length,animalsKilled:raw.animalsKilled||0,materialsCollected:raw.materialsCollected||0,topMaterials:Object.entries(raw.collectedByType||{}).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([name,count])=>({name,count}))}}
async function loadConfigs() { const configs = await readConfigs(), secrets = await readSecrets(); return Promise.all(configs.map(async x => {let lifetime=null;try{lifetime=lifetimeSummary(JSON.parse(await fs.readFile(path.join(app.getPath('userData'),`lifetime-${x.id}.json`),'utf8')))}catch{}return{...x,hasCloudApiKey:!!secrets[x.id],lifetime}})) }
async function saveConfigs(items) {
  const secrets = await readSecrets(), ids = new Set(items.map(x=>x.id)), sanitized = []
  for (const item of items) {
    const { cloudApiKey, hasCloudApiKey, lifetime, ...safe } = item
    if (cloudApiKey) { if (!safeStorage.isEncryptionAvailable()) throw new Error('Impossibile cifrare la API key su questo sistema'); secrets[item.id] = safeStorage.encryptString(cloudApiKey).toString('base64') }
    sanitized.push(safe)
  }
  for (const id of Object.keys(secrets)) if (!ids.has(id)) delete secrets[id]
  await fs.mkdir(app.getPath('userData'), { recursive: true }); await fs.writeFile(configFile(), JSON.stringify(sanitized, null, 2)); await writeSecrets(secrets)
  return sanitized.map(x => ({ ...x, hasCloudApiKey: !!secrets[x.id] }))
}

function send(channel, payload) { if (win && !win.isDestroyed()) win.webContents.send(channel, payload) }
async function showAbout() {
  const result = await dialog.showMessageBox(win, { type: 'info', title: 'About Minecraft RAG Bots', message: 'Minecraft RAG Bots', detail: `Versione ${app.getVersion()}\nAutore: ${AUTHOR}\n\nDashboard AI locale e cloud per agenti Minecraft.\n${GITHUB_URL}`, buttons: ['OK', 'Apri GitHub'], defaultId: 0, cancelId: 0 })
  if (result.response === 1) await shell.openExternal(GITHUB_URL)
}
async function showChangelog() {
  const version=app.getVersion(), candidates=[path.join(process.cwd(),'docs',`RELEASE-NOTES-${version}.md`),path.join(here,'..','docs',`RELEASE-NOTES-${version}.md`),path.join(process.resourcesPath,'docs',`RELEASE-NOTES-${version}.md`),path.join(process.cwd(),'docs','RELEASE-NOTES-0.19.28.md')]
  let text=`Versione ${version}\n\nConsulta la release GitHub per il changelog completo.`
  for(const file of candidates){try{text=await fs.readFile(file,'utf8');break}catch{}}
  await dialog.showMessageBox(win,{type:'info',title:`Changelog Minecraft RAG Bots ${version}`,message:`Novità della versione ${version}`,detail:text,buttons:['OK','Apri release GitHub'],defaultId:0,cancelId:0}).then(r=>{if(r.response===1)shell.openExternal(`${GITHUB_URL}/releases/tag/v${version}`)})
}
async function runUpdateCheck() {
  try {
    const update = await checkForUpdates(app.getVersion(), GITHUB_REPO)
    if (update.status === 'available') {
      const result = await dialog.showMessageBox(win, { type:'info', title:'Aggiornamento disponibile', message:`È disponibile la versione ${update.latestVersion}`, detail:`Versione installata: ${update.currentVersion}`, buttons:['Apri pagina download','Più tardi'], defaultId:0, cancelId:1 })
      if (result.response === 0) await shell.openExternal(update.url)
    } else await dialog.showMessageBox(win, { type:'info', title:'Controllo aggiornamenti', message:update.status === 'current' ? 'Minecraft RAG Bots è aggiornato.' : 'Aggiornamenti non ancora disponibili.', detail:update.message || `Versione installata: ${update.currentVersion}` })
  } catch (error) { await dialog.showMessageBox(win, { type:'warning', title:'Controllo aggiornamenti', message:'Impossibile verificare gli aggiornamenti.', detail:`${error.message}\n\nControlla la connessione o riprova quando il repository sarà pubblico.` }) }
}
async function collectExportData() {
  const result = {}
  try {
    for (const name of await fs.readdir(app.getPath('userData'))) {
      if (!/^(memory|skills|biography|chests|performance|world-map|lifetime|startup|team-checkpoints)-.+\.json$/.test(name)&&!/^technical-log-.+\.jsonl$/.test(name)) continue
      try { const text=await fs.readFile(path.join(app.getPath('userData'),name),'utf8');result[name]=name.endsWith('.jsonl')?text.split(/\r?\n/).filter(Boolean).map(line=>JSON.parse(line)):JSON.parse(text) } catch {}
    }
  } catch {}
  return result
}
async function exportConfiguration(single) {
  try {
    if (single && !selectedBotId) return dialog.showMessageBox(win, { type:'info', title:'Esporta bot', message:'Seleziona prima un bot nell’elenco.' })
    const configs = await readConfigs(), dataFiles = await collectExportData()
    const bundle = createExportPackage({ configs, dataFiles, selectedId:single ? selectedBotId : null, appVersion:app.getVersion() })
    const label = single ? (configs.find(x=>x.id===selectedBotId)?.name || 'bot') : 'configurazione-completa'
    const result = await dialog.showSaveDialog(win, { title:single ? 'Esporta bot selezionato' : 'Esporta configurazione completa', defaultPath:`${label.replace(/[^a-z0-9_-]/gi,'_')}-${new Date().toISOString().slice(0,10)}.mrb.json`, filters:[{name:'Minecraft RAG Bots Export',extensions:['json']}] })
    if (result.canceled || !result.filePath) return
    await fs.writeFile(result.filePath, JSON.stringify(bundle, null, 2))
    await dialog.showMessageBox(win, { type:'info', title:'Esportazione completata', message:single ? 'Bot esportato correttamente.' : 'Configurazione completa esportata correttamente.', detail:'Memoria, abilità e biografia sono incluse. Le API key sono escluse.' })
  } catch (error) { await dialog.showMessageBox(win, { type:'error', title:'Errore di esportazione', message:'Impossibile completare l’esportazione.', detail:error.message }) }
}
function installApplicationMenu() {
  const template = [
    { label:'File', submenu:[{ label:'Esporta bot selezionato…', accelerator:'CmdOrCtrl+E', click:()=>exportConfiguration(true) }, { label:'Esporta configurazione completa…', click:()=>exportConfiguration(false) }, { type:'separator' }, { label:'Esci', accelerator:process.platform === 'darwin' ? 'Cmd+Q' : 'Alt+F4', click:()=>app.quit() }] },
    { label:'Help', submenu:[{ label:'Configurazione Ollama…', click:()=>send('ollama:open') }, { type:'separator' }, { label:'About Minecraft RAG Bots', click:showAbout }, { label:'Changelog…', click:showChangelog }, { type:'separator' }, { label:'Sito GitHub', click:()=>shell.openExternal(GITHUB_URL) }, { label:'Controlla aggiornamenti…', click:runUpdateCheck }] }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}
app.whenReady().then(async () => {
  manager = new BotManager(app.getPath('userData'))
  manager.on('update', x => send('bot:update', x)); manager.on('removed', id => send('bot:removed', id))
  manager.on('microsoft-code', async code => {
    const target = code.verificationUriComplete || code.verificationUri
    const result = await dialog.showMessageBox(win, {
      type: 'info', title: 'Accesso Microsoft richiesto',
      message: `Accedi all’account di ${code.botName || code.account}`,
      detail: `Account: ${code.account}\nCodice: ${code.userCode}\n\nLa password viene inserita esclusivamente nel sito Microsoft e non viene salvata da Minecraft RAG Bots. Dopo il primo accesso, la sessione di questo bot verrà riutilizzata.`,
      buttons: ['Apri Microsoft e copia codice', 'Copia solo il codice', 'Chiudi'], defaultId: 0, cancelId: 2
    })
    if (result.response <= 1) clipboard.writeText(code.userCode || '')
    if (result.response === 0 && target) await shell.openExternal(target)
  })
  win = new BrowserWindow({ width: 1440, height: 900, minWidth: 1050, minHeight: 680, backgroundColor: '#0b1016', title: 'Minecraft RAG Bots', webPreferences: { preload: path.join(here, 'preload.cjs'), contextIsolation: true, nodeIntegration: false } })
  installApplicationMenu()
  await win.loadFile(path.join(here, 'ui', 'index.html'))
  const marker=path.join(app.getPath('userData'),'last-seen-version.txt'),previous=await fs.readFile(marker,'utf8').catch(()=>''),current=app.getVersion();await fs.writeFile(marker,current);if(previous&&previous.trim()!==current)send('app:update-banner',{version:current})
})
app.on('window-all-closed', () => { manager?.closeAll(); if (process.platform !== 'darwin') app.quit() })
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) app.relaunch() })

ipcMain.handle('config:list', () => loadConfigs())
ipcMain.handle('ollama:status', () => ollamaStatus())
ipcMain.handle('ollama:start', () => startOllama())
ipcMain.handle('ollama:install', () => installOllama())
ipcMain.handle('ollama:setup-models', () => setupOllamaModels())
ipcMain.handle('app:changelog', () => showChangelog())
ipcMain.on('ui:selected-bot', (_, id) => { selectedBotId = typeof id === 'string' ? id : null })
ipcMain.handle('config:save', (_, items) => saveConfigs(items))
ipcMain.handle('bot:list', () => manager.snapshots())
ipcMain.handle('bot:connect', async (_, cfg) => manager.connect({ ...cfg, cloudApiKey: cfg.aiProvider === 'cloud' ? await getApiKey(cfg.id) : '' }))
ipcMain.handle('bot:start', (_, id) => manager.start(id))
ipcMain.handle('bot:stop', (_, id) => manager.stop(id))
ipcMain.handle('bot:disconnect', (_, id) => manager.disconnect(id))
ipcMain.handle('bot:prompt', (_, { id, text }) => manager.prompt(id, text))
ipcMain.handle('bot:prompt-all', (_, text) => manager.promptAll(text))
ipcMain.handle('bot:create-child', (_, { parentAId, parentBId, options }) => manager.createChild(parentAId, parentBId, options))
ipcMain.handle('bot:stop-all', () => manager.stopAll())
ipcMain.handle('map:get',async(_,id)=>{try{return manager.mapData(id)}catch{if(!/^[a-z0-9-]+$/i.test(id||''))throw new Error('Identificatore bot non valido');try{const data=JSON.parse(await fs.readFile(path.join(app.getPath('userData'),`world-map-${id}.json`),'utf8'));let chests=[],lifetime=null;try{chests=Object.values(JSON.parse(await fs.readFile(path.join(app.getPath('userData'),`chests-${id}.json`),'utf8')))}catch{}try{const raw=JSON.parse(await fs.readFile(path.join(app.getPath('userData'),`lifetime-${id}.json`),'utf8'));lifetime={distanceMeters:raw.distanceMeters||0,distanceKm:Math.round(raw.distanceMeters||0)/1000,playersEncountered:Object.keys(raw.playersEncountered||{}).length,botsEncountered:Object.keys(raw.botsEncountered||{}).length,animalsKilled:raw.animalsKilled||0,materialsCollected:raw.materialsCollected||0,topMaterials:Object.entries(raw.collectedByType||{}).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([name,count])=>({name,count}))}}catch{}return{cellSize:data.cellSize||4,cells:Object.values(data.cells||{}),trail:data.trail||[],position:data.trail?.at(-1)||null,chests,pois:Object.values(data.pois||{}),lifetime}}catch{throw new Error('La mappa sarà disponibile dopo che il bot avrà esplorato il mondo')}}})
ipcMain.handle('benchmark:export',async(_,id)=>{const report=manager.benchmarkReport(id);let gpu={},ollama=[];try{gpu=await app.getGPUInfo('basic')}catch{}try{const response=await fetch('http://localhost:11434/api/ps',{signal:AbortSignal.timeout(3000)});if(response.ok)ollama=(await response.json()).models||[]}catch{}report.hardware={platform:`${os.platform()} ${os.release()} ${os.arch()}`,cpu:os.cpus()[0]?.model||'unknown',logicalCpuCount:os.cpus().length,ramBytes:os.totalmem(),gpu:gpu.gpuDevice||[],ollamaLoadedModels:ollama.map(x=>({name:x.name,size:x.size,sizeVram:x.size_vram,contextLength:x.context_length}))};report.appVersion=app.getVersion();const result=await dialog.showSaveDialog(win,{title:'Esporta benchmark bot',defaultPath:`${report.bot.name.replace(/[^a-z0-9_-]/gi,'_')}-${report.performance.version}-benchmark.json`,filters:[{name:'Benchmark JSON',extensions:['json']}]});if(result.canceled||!result.filePath)return false;await fs.writeFile(result.filePath,JSON.stringify(report,null,2));return true})
ipcMain.handle('technical-log:copy',async(_,id)=>{const report=await manager.technicalReport(id);report.startup=manager.snapshot(id)?.startup||null;clipboard.writeText(JSON.stringify(report,null,2));return report.logs.length})
ipcMain.handle('technical-log:export',async(_,id)=>{const report=await manager.technicalReport(id);report.startup=manager.snapshot(id)?.startup||null;const name=report.bot.name.replace(/[^a-z0-9_-]/gi,'_'),result=await dialog.showSaveDialog(win,{title:'Esporta attività tecnica',defaultPath:`${name}-attivita-tecnica-${new Date().toISOString().slice(0,10)}.json`,filters:[{name:'Report tecnico JSON',extensions:['json']},{name:'Tutti i file',extensions:['*']}]});if(result.canceled||!result.filePath)return false;await fs.writeFile(result.filePath,JSON.stringify(report,null,2));return true})
ipcMain.handle('biography:export', async (_, id) => {
  const bio = manager.biographyMarkdown(id)
  const result = await dialog.showSaveDialog(win, { title: 'Esporta biografia', defaultPath: `${bio.name.replace(/[^a-z0-9_-]/gi, '_')}-biografia.md`, filters: [{ name: 'Markdown', extensions: ['md'] }] })
  if (result.canceled || !result.filePath) return false
  await fs.writeFile(result.filePath, bio.markdown); return true
})
ipcMain.handle('biography:epic-book', async (_, id) => {
  const target = manager.entries.get(id)
  if (!target) throw new Error('Bot non connesso')
  const result = await dialog.showSaveDialog(win, { title: 'Genera libro epico', defaultPath: `${target.config.name.replace(/[^a-z0-9_-]/gi, '_')}-saga-epica.md`, filters: [{ name: 'Libro Markdown', extensions: ['md'] }] })
  if (result.canceled || !result.filePath) return false
  const book = await manager.generateEpicBook(id, progress => send('book:progress', progress))
  await fs.writeFile(result.filePath, book.markdown); return true
})
ipcMain.handle('item:icons', async (_, { names, version }) => {
  const safeNames = Array.isArray(names) ? names.slice(0, 100).filter(x => /^[a-z0-9_]+$/.test(x)) : []
  const safeVersion = /^\d+\.\d+(\.\d+)?$/.test(version || '') ? version : '1.21.4'
  let assets
  try { assets = assetCache.get(safeVersion) || minecraftAssets(safeVersion); assetCache.set(safeVersion, assets) }
  catch { assets = assetCache.get('1.21.4') || minecraftAssets('1.21.4'); assetCache.set('1.21.4', assets) }
  const result = Object.fromEntries(safeNames.map(name => [name, assets.textureContent[name]?.texture || null]))
  // minecraft-assets può associare alcuni blocchi (chest/crafting_table) alla
  // texture del materiale base. Per l'inventario preferiamo l'item PNG reale.
  for (const name of safeNames) {
    if (!/^(chest|trapped_chest|ender_chest|crafting_table|furnace|barrel)$/.test(name)) continue
    try {
      const root = path.dirname(require.resolve('minecraft-assets/package.json'))
      const file = path.join(root, 'minecraft-assets', 'data', safeVersion, 'items', `${name}.png`)
      const data = await fs.readFile(file)
      result[name] = `data:image/png;base64,${data.toString('base64')}`
    } catch {}
  }
  return result
})
ipcMain.handle('open:external', (_, url) => { if (/^https:\/\//.test(url)) return shell.openExternal(url) })
