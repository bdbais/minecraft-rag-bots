# Minecraft RAG Bots 0.19.76

## Raccolta verificata degli oggetti

- `collect_drops` ora effettua un secondo avvicinamento quando l'oggetto non viene raccolto subito.
- L'azione verifica che l'entità dell'item sia realmente sparita prima di restituire successo.
- Se l'oggetto resta a terra, il fallimento viene registrato e può attivare il recupero automatico invece di lasciare il bot apparentemente bloccato.
- La raccolta automatica dopo caccia, combattimento e raccolta blocchi usa la stessa verifica.

## Robustezza

- Combattimento e fuga ambientale non inizializzano il pathfinder con movimenti incompleti durante il bootstrap.
- La fuga da acqua/lava conserva un messaggio diagnostico esplicito quando il bot resta intrappolato.

Test automatici: 82 passati.
