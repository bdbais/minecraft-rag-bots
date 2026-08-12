# Minecraft RAG Bots 0.19.82

## Prima difesa redstone

- Aggiunta l'azione `build_redstone_defense`.
- Quando una base è nota e torcia redstone più comando sono disponibili, il bot posiziona i componenti su blocchi solidi senza rompere strutture.
- La posizione viene pubblicata come checkpoint di pericolo/difesa per tutta la squadra.
- La costruzione viene verificata: se non vengono posizionati entrambi i componenti, l'azione fallisce e il recupero può cambiare strategia.

Test automatici: 90 passati.
