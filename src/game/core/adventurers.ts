/** Supplied CC0 Blocky character collection. The duplicate -8-2 folder adds no new models. */
export const BLOCKY_BASE = "/world3d/blocky-characters";
export const ADVENTURERS = [
  { id: "head-blocky-hero", name: "City Hero", file: "blocky_01_hero", style: "blocky", description: "A bright, blocky everyday adventurer." },
  { id: "head-blocky-knight", name: "Knight", file: "blocky_03_knight", style: "blocky", description: "A cheerful block-built knight." },
  { id: "head-blocky-wizard", name: "Wizard", file: "blocky_05_wizard", style: "blocky", description: "A storybook spellcaster." },
  { id: "head-blocky-pirate", name: "Pirate", file: "blocky_06_pirate", style: "blocky", description: "A bold little city explorer." },
  { id: "head-blocky-astronaut", name: "Astronaut", file: "blocky_07_astronaut", style: "blocky", description: "A space-ready character." },
  { id: "head-blocky-robot", name: "Robot", file: "blocky_08_robot", style: "blocky", description: "A friendly robot resident." },
  { id: "head-blocky-zombie", name: "Zombie", file: "blocky_09_zombie", style: "blocky", description: "A playful, not-so-spooky zombie." },
  { id: "head-blocky-princess", name: "Princess", file: "blocky_19_princess", style: "blocky", description: "A teal royal outfit." },
  { id: "head-blocky-classic-hero", name: "City Hero · Classic", file: "classic_blocky_01_hero", style: "blocky", description: "The original sample character design." },
  { id: "head-blocky-classic-knight", name: "Knight · Classic", file: "classic_blocky_03_knight", style: "blocky", description: "The original sample knight design." },
  { id: "head-blocky-classic-wizard", name: "Wizard · Classic", file: "classic_blocky_05_wizard", style: "blocky", description: "The original sample wizard design." },
  { id: "head-blocky-classic-pirate", name: "Pirate · Classic", file: "classic_blocky_06_pirate", style: "blocky", description: "The original sample pirate design." },
  { id: "head-blocky-classic-astronaut", name: "Astronaut · Classic", file: "classic_blocky_07_astronaut", style: "blocky", description: "The original sample astronaut design." },
  { id: "head-blocky-classic-robot", name: "Robot · Classic", file: "classic_blocky_08_robot", style: "blocky", description: "The original sample robot design." },
  { id: "head-blocky-classic-zombie", name: "Zombie · Classic", file: "classic_blocky_09_zombie", style: "blocky", description: "The original sample zombie design." },
  { id: "head-blocky-classic-princess", name: "Princess · Classic", file: "classic_blocky_19_princess", style: "blocky", description: "The original sample princess design." },
] as const;
/** Legacy or unknown character choices always resolve to the supplied City Hero. */
export const adventurerFor = (head: string | undefined) => ADVENTURERS.find(m => m.id === (head === "head-blocky-princess-rose" ? "head-blocky-classic-princess" : head)) ?? ADVENTURERS[0];
export const blockyThumbnail = (head: string | undefined) => `${BLOCKY_BASE}/${adventurerFor(head).file}.png`;
