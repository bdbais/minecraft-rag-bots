# Minecraft RAG Bots v0.19.20 Beta

## Recupero memoria RAG corrotta

- Un file JSON della memoria troncato o danneggiato non blocca più il bootstrap.
- Il file viene conservato con estensione `.corrupt-*.bak` per diagnosi e la memoria viene ricreata vuota.
- Il bot può riconnettersi e ricostruire gradualmente le proprie esperienze.

All 59 automated tests pass.
