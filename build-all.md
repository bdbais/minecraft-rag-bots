# Creazione degli installer

Gli installer vanno prodotti sul sistema operativo di destinazione, soprattutto per macOS (firma, notarizzazione e formato DMG).

## Windows

```powershell
npm ci
npm run dist:win
```

Produce un installer NSIS e una versione portable in `dist/`.

La versione portable opzionale si crea separatamente con `npm run dist:win:portable`.

## Linux

```bash
npm ci
npm run dist:linux
```

Produce AppImage e pacchetto Debian in `dist/`.

## macOS

```bash
npm ci
npm run dist:mac
```

Produce DMG e ZIP. Per distribuire senza avvisi Gatekeeper configurare un certificato Apple Developer ID e le credenziali di notarizzazione secondo electron-builder.

## Requisiti sul computer dell’utente

- Minecraft Java Edition e un account/server autorizzato.
- Per i bot locali, Ollama e i modelli richiesti: la procedura guidata dell’app li verifica e configura; l’installazione automatica è disponibile su Windows, mentre su Linux/macOS viene aperto il download ufficiale.
- Per i bot Cloud, Ollama non è necessario.
