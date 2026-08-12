const fs = require('node:fs')
const path = require('node:path')
const { spawn } = require('node:child_process')

if (process.platform !== 'win32') {
  console.log('Avvio automatico installer: disponibile solo su Windows.')
  process.exit(0)
}
const dist = path.resolve(__dirname, '..', 'dist')
const candidates = fs.readdirSync(dist, { withFileTypes: true })
  .filter(x => x.isFile() && /Windows-Setup-x64\.exe$/i.test(x.name))
  .map(x => ({ file: path.join(dist, x.name), mtime: fs.statSync(path.join(dist, x.name)).mtimeMs }))
  .sort((a, b) => b.mtime - a.mtime)
if (!candidates.length) throw new Error('Installer Windows non trovato in dist/')
const installer = candidates[0].file
console.log(`Avvio installer: ${installer}`)
const child = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', 'Start-Process -FilePath $args[0] -Verb RunAs', installer], { stdio: 'inherit', windowsHide: false })
child.on('error', error => { console.error(`Impossibile avviare l’installer: ${error.message}`); process.exitCode = 1 })
