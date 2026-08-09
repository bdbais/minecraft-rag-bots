const WRITER_SYSTEM = `You are an original high-fantasy chronicler. Write in Italian with a mythic, solemn, lyrical voice, rich landscapes, fellowship, courage, loss, and hope. Do not imitate any named author, reproduce copyrighted phrases, or use characters, places, objects, lore, or terminology from existing fantasy franchises. Base all deeds and outcomes on the supplied bot chronicle. Preserve recorded weather exactly when present; you may enrich its atmosphere, emotion and dialogue, but never change it or invent major achievements. Return polished Markdown only.`

export function prepareChronicle(protagonist, biographies) {
  const events = biographies.flatMap(b => b.events.map(e => ({ ...e, hero: b.identity.name, username: b.identity.username }))).sort((a,b) => a.at.localeCompare(b.at))
  return { protagonist, heroes: biographies.map(b => b.identity), events }
}

export class EpicBookGenerator {
  constructor(ollama) { this.ollama = ollama }
  async generate(source, onProgress = () => {}) {
    const chunks = []
    for (let i = 0; i < source.events.length; i += 35) chunks.push(source.events.slice(i, i + 35))
    if (!chunks.length) throw new Error('La cronologia non contiene ancora eventi sufficienti')
    const chapters = []
    for (let i = 0; i < chunks.length; i++) {
      onProgress({ current: i + 1, total: chunks.length + 1, message: `Scrittura del capitolo ${i + 1}` })
      const previous = chapters.at(-1)?.slice(-1800) || 'Questo è il primo capitolo.'
      const prompt = `PROTAGONISTA: ${JSON.stringify(source.protagonist)}\nCOMPAGNIA: ${JSON.stringify(source.heroes)}\nCAPITOLO ${i + 1} DI ${chunks.length}\nEVENTI DOCUMENTATI:\n${JSON.stringify(chunks[i], null, 2)}\nCONTINUITÀ DAL CAPITOLO PRECEDENTE:\n${previous}\n\nScrivi un capitolo di 900-1400 parole. Inizia con “## Capitolo ${i + 1} —” seguito da un titolo originale. Mantieni nomi e risultati documentati. Trasforma dettagli tecnici in narrazione fantasy comprensibile.`
      chapters.push(await this.ollama.write(WRITER_SYSTEM, prompt, 240000))
    }
    onProgress({ current: chunks.length + 1, total: chunks.length + 1, message: 'Composizione di titolo, prologo ed epilogo' })
    const outline = chapters.map((x,i) => `Capitolo ${i+1}: ${x.slice(0,700)}`).join('\n')
    const frame = await this.ollama.write(WRITER_SYSTEM, `PROTAGONISTA: ${JSON.stringify(source.protagonist)}\nCOMPAGNIA: ${JSON.stringify(source.heroes)}\nSINTESI DEI CAPITOLI:\n${outline}\n\nCrea in Markdown: un titolo H1 originale, un sottotitolo, una breve nota “Cronaca generata dalle avventure realmente registrate nel mondo di Minecraft”, un prologo di 500-800 parole e un epilogo di 500-800 parole. Se la storia è incompleta, l'epilogo deve lasciare il viaggio aperto. Separa prologo ed epilogo con intestazioni H2.` , 240000)
    const epilogueAt = frame.indexOf('## Epilogo')
    const beginning = epilogueAt >= 0 ? frame.slice(0, epilogueAt).trim() : frame.trim()
    const ending = epilogueAt >= 0 ? frame.slice(epilogueAt).trim() : '## Epilogo\n\nLa cronaca resta aperta, in attesa di nuove gesta.'
    onProgress({ current: chunks.length + 1, total: chunks.length + 1, message: 'Libro completato' })
    return `${beginning}\n\n---\n\n${chapters.join('\n\n---\n\n')}\n\n---\n\n${ending}\n`
  }
}
