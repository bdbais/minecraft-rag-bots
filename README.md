# Ollama Minecraft RAG Agent

A local-first desktop control center for multiple experimental Minecraft Java Edition players. Mineflayer connects each bot as a normal client, Ollama plans one bounded action at a time, and persistent vector memories retrieve game knowledge plus each bot's previous successes and failures.

## What it can do

- Observe health, hunger, position, inventory, nearby blocks, and nearby entities.
- Walk, collect blocks, craft, equip, eat, chat, and fight nearby mobs.
- Retrieve relevant memories with Ollama embeddings before every decision.
- Save every action outcome, so later plans can avoid repeated failures.
- Follow a supplied progression guide toward the Ender Dragon.

This is an agent framework, not a guarantee that a small local model will finish arbitrary worlds unattended. Complex tasks such as portal construction, furnace/chest interfaces, precise combat, and robust recovery need additional deterministic skills. Run it on a private test server first. Respect server rules; anti-cheat systems may reject bots.

The dashboard and GPS map maintain lifetime statistics for each bot: travelled kilometres, unique human players and teammate bots encountered, animals killed, and collected inventory materials. These counters persist across sessions and are included in exports and benchmark reports.

Bots on the same server also share a persistent checkpoint board. Chests, mines, dungeons, unusual monsters, resources, dangers, portals, workstations and bases can be published with coordinates and notes. Important map discoveries are added automatically; agents can also use `share_checkpoint`, and every teammate receives the board in its planning context after restarts or when far away.

Perception uses multiple ranges: detailed nearby blocks, strategic blocks and coordinates up to a configurable 24/48/64-block radius, distant entities, and a wider terrain-map sample. Results are cached briefly to keep multi-bot CPU usage controlled; 48 blocks is the recommended default.

Ogni bot mantiene inoltre una conoscenza persistente del mondo: terreni esplorati, risorse, alberi, lana, minerali, contenitori, pericoli e postazioni conservano coordinate, ultimo avvistamento e numero di conferme. L'agente distingue sempre ciò che vede ora da ciò che ricorda e può tornare verso una risorsa conosciuta anche quando non è più nel campo visivo. Il crafting risolve nomi comuni italiani e inglesi e sceglie automaticamente specie del legno, colore e materiale per ricette registrate di inventario e banco da lavoro.

## Setup

L’app desktop verifica automaticamente Ollama al primo avvio. La configurazione guidata consente di installarlo opzionalmente, avviare il servizio, scaricare il modello scelto e `nomic-embed-text`, quindi creare `minecraft-agent`. Il controllo può essere riaperto da **Help → Configurazione Ollama**. Se si usano esclusivamente modelli Cloud, Ollama può essere ignorato.

Dalla versione 0.13 il modello base viene scelto in base a RAM, CPU e tipo di GPU. Su portatili con sola grafica Intel viene preferito `qwen3:1.7b`; una micro-prova reale può ridurlo a `qwen3:0.6b` se la risposta supera 20 secondi. Durante il gioco, due timeout AI consecutivi attivano automaticamente `minecraft-agent-lite`. La scelta e il tempo misurato sono visibili in **Help → Configurazione Ollama**.

1. Install Node.js 20+, Ollama, and Minecraft Java Edition.
2. Start Ollama and install the models:

   ```powershell
   ollama pull gemma3
   ollama pull nomic-embed-text
   ollama create minecraft-agent -f Modelfile
   ```

3. Install dependencies and configure the server:

   ```powershell
   npm install
   Copy-Item .env.example .env
   ```

4. Edit `.env`. For a private server in offline mode, keep `MC_AUTH=offline`. For a normal online-mode server use `MC_AUTH=microsoft` and set `MC_USERNAME` to the Microsoft account email. The desktop app opens the official Microsoft device-login flow on first connection, then reuses a separate cached session for that bot. Passwords are never requested, stored, or exported. Each simultaneously connected premium bot normally needs its own licensed Minecraft Java account.
5. Start the desktop dashboard:

   ```powershell
   npm start
   ```

Create one or more bot profiles in the UI, connect them, inspect live statistics, and send high-priority prompts. The original terminal mode remains available with `npm run start:cli`.

## Desktop installers

Run `npm run dist:win`, `npm run dist:linux`, or `npm run dist:mac` on the respective operating system. See `build-all.md` for details. Signed/notarized macOS distribution requires an Apple Developer certificate.

## Architecture

`observe -> retrieve memories -> Ollama structured decision -> validate/execute one action -> save outcome`

## Benchmark MBPI

La dashboard calcola un indice persistente MBPI-1 da 0 a 1000 usando qualità/successi (55%), azioni al minuto (25%), traguardi di gioco (15%) e stabilità (5%). La confidenza cresce fino a 20 azioni; prima di allora il valore è indicato come provvisorio. **Esporta benchmark** produce un JSON con metrica, modello, provider, CPU, RAM, GPU e memoria VRAM dichiarata da Ollama. Per confronti corretti usare la stessa versione MBPI, un mondo o seed equivalente, lo stesso tempo di prova e regole identiche.

Memory is stored in `data/memory.json`. Delete that file to reset learned experience. The embedding model must remain the same for a given memory file.

## Next capabilities to add

The most useful deterministic skills are furnace operation, placing blocks and portal frames, chest storage, ranged combat, bed use, trading, and an explicit milestone state machine. Those make end-to-end completion much more reliable than asking the language model to improvise every low-level move.
