# Minecraft RAG Bots 0.19.83

## Deposito autonomo

- `store_items` ora crea e posiziona una chest quando non esiste un contenitore vicino.
- Il punto viene scelto solo su un blocco solido con spazio libero, senza rompere strutture.
- Dopo il deposito aggiorna la memoria del contenitore e pubblica un checkpoint condiviso.
- L'inventario può quindi auto-organizzarsi anche in una nuova base o durante una spedizione.

Test automatici: 91 passati.
