# Minecraft RAG Bots v0.19.8 Beta

## Hazard escape and survival recovery

- Detects nearby lava and water hazards from the bot's world observation.
- Adds the deterministic `escape_hazard` action: cancels unsafe movement, finds a solid floor with two clear blocks for the bot, and pathfinds away from the hazard.
- Hazard escape takes priority over autonomous wandering and progression, reducing the chance of getting trapped between lava, water, or other dangerous terrain.
- Keeps the existing progress watchdog and reports a clear failure when no safe neighboring cell can be found.

All 58 automated tests pass.
