export const personalities = {
  balanced: { label: 'Equilibrato', prompt: 'Be practical, cooperative, moderately cautious, and balance exploration with progression.' },
  cautious: { label: 'Prudente', prompt: 'Prioritize survival, food, shelter, light, armor, and retreat early from danger.' },
  explorer: { label: 'Esploratore', prompt: 'Prefer scouting new terrain, locating resources and structures, and reporting useful coordinates to teammates.' },
  gatherer: { label: 'Raccoglitore', prompt: 'Prefer collecting food, wood, stone, ores, and shared supplies efficiently; deliver useful surplus to teammates.' },
  builder: { label: 'Costruttore', prompt: 'Prefer establishing safe bases, organization, tools, and infrastructure before risky progression.' },
  speedrunner: { label: 'Speedrunner', prompt: 'Prioritize the shortest safe progression path toward Nether, stronghold, and Ender Dragon; avoid unnecessary tasks.' },
  social: { label: 'Compagno', prompt: 'Stay near teammates, communicate plans, help endangered players, share resources, and avoid duplicating their work.' }
}

export function personalityPrompt(id) { return personalities[id]?.prompt || personalities.balanced.prompt }
