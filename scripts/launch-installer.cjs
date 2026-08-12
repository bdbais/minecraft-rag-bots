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
  .map(x => ({ file: path.join(dist, x.name), stat: fs.statSync(path.join(dist, x.name)) }))
  .filter(x => x.stat.size > 50 * 1024 * 1024)
  .map(x => ({ file: x.file, mtime: x.stat.mtimeMs }))
  .sort((a, b) => b.mtime - a.mtime)
if (!candidates.length) throw new Error('Installer Windows non trovato in dist/')
const installer = candidates[0].file
console.log(`Avvio installer: ${installer}`)
const escaped = installer.replace(/'/g, "''")
const command = `Start-Process -FilePath '${escaped}' -Verb RunAs`
const child = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command], { stdio: 'inherit', windowsHide: false })
child.on('error', error => { console.error(`Impossibile avviare l’installer: ${error.message}`); process.exitCode = 1 })
