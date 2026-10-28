export type Rule = 'knockout' | 'bank' | 'pocket' | 'duel';
export type ArenaId = 'nour' | 'workshop' | 'courtyard' | 'alexandria' | 'delta' | 'festival';
export type MarbleDefinition = { position: [number, number, number]; radius: number; color: number };
export type Barrier = { x: number; z: number; width: number; depth: number; height: number; angle?: number; material: 'stone' | 'wood' | 'metal'; bank?: boolean };
export type GroundZone = { x: number; z: number; radius: number; drag: number; kind: 'water' | 'sand' };
export type Arena = {
  id: ArenaId; name: string; location: string; chapter: string; subtitle: string;
  unlockStars: number; look: 'afternoon' | 'overcast' | 'evening';
  surface: 'earth' | 'concrete' | 'tile' | 'wet' | 'sand';
  friction: number; rollingDrag: number; groundTint: number; wallTint: number; shutterTint: number;
  zones: GroundZone[];
};
export type Rival = { name: string; title: string; error: number; power: number; color: number; opening: string; win: string; lose: string };
export type Level = {
  id: string; arena: ArenaId; name: string; subtitle: string; rule: Rule;
  target: number; shots: number; silver: number; gold: number; ringRadius: number;
  layout: MarbleDefinition[]; barriers: Barrier[];
  pockets: { x: number; z: number; radius: number }[];
  requires?: string; rival?: Rival;
};

const pigments = [0x158e57, 0xd74625, 0x156ace, 0xe6a632, 0x279f91, 0x763d97, 0xce5525, 0xcc708c, 0x85ad36];
function layout(positions: [number, number][], home: [number, number] = [0.015, 0.69]): MarbleDefinition[] {
  return [
    { position: [home[0], 0.035, home[1]], radius: 0.035, color: 0x087fbc },
    ...positions.map(([horizontal, depth], index) => ({ position: [horizontal, 0.029, depth] as [number, number, number], radius: 0.029, color: pigments[index % pigments.length] })),
  ];
}

export const ARENAS: Arena[] = [
  { id: 'nour', name: 'Giza Rooftops', location: 'Nazlet El-Semman, Giza', chapter: '01', subtitle: 'The pyramids beyond your rooftop. An old tin in your hands.', unlockStars: 0, look: 'afternoon', surface: 'concrete', friction: 0.24, rollingDrag: 0.38, groundTint: 0xd1c7b5, wallTint: 0xc8c4b5, shutterTint: 0x2b6766, zones: [] },
  { id: 'workshop', name: 'Al-Muizz Alley', location: 'Al-Muizz Street, Cairo', chapter: '02', subtitle: 'Find the angle nobody else sees.', unlockStars: 2, look: 'afternoon', surface: 'concrete', friction: 0.19, rollingDrag: 0.27, groundTint: 0xc7c9c4, wallTint: 0xb6bab4, shutterTint: 0x646f8b, zones: [] },
  { id: 'courtyard', name: 'Citadel Terrace', location: 'Cairo Citadel', chapter: '03', subtitle: 'A quiet square. A very small opening.', unlockStars: 4, look: 'afternoon', surface: 'tile', friction: 0.17, rollingDrag: 0.25, groundTint: 0xc4c6b1, wallTint: 0xddcfb7, shutterTint: 0x355a68, zones: [] },
  { id: 'alexandria', name: 'Alexandria Beach', location: 'Alexandria', chapter: '04', subtitle: 'The sea air changes everything.', unlockStars: 7, look: 'overcast', surface: 'wet', friction: 0.12, rollingDrag: 0.18, groundTint: 0xadb8c3, wallTint: 0xd1dce0, shutterTint: 0x327a8d, zones: [{ x: -0.27, z: 0.23, radius: 0.14, drag: 2.7, kind: 'water' }, { x: 0.26, z: -0.20, radius: 0.13, drag: 2.5, kind: 'water' }] },
  { id: 'delta', name: 'The Delta Lane', location: 'Nile Delta', chapter: '05', subtitle: 'Soft ground rewards a steady hand.', unlockStars: 10, look: 'afternoon', surface: 'sand', friction: 0.30, rollingDrag: 0.46, groundTint: 0xe0cfb0, wallTint: 0xc8bbae, shutterTint: 0x628265, zones: [{ x: -0.17, z: 0.23, radius: 0.14, drag: 2.2, kind: 'sand' }, { x: 0.26, z: -0.13, radius: 0.13, drag: 1.9, kind: 'sand' }] },
  { id: 'festival', name: 'Khan el-Khalili', location: 'Cairo, after iftar', chapter: '06', subtitle: 'One circle. The whole neighborhood watching.', unlockStars: 13, look: 'evening', surface: 'earth', friction: 0.22, rollingDrag: 0.32, groundTint: 0xd5d1c2, wallTint: 0xc6b9af, shutterTint: 0x6b4e61, zones: [] },
];

const mariam: Rival = { name: 'Mariam', title: 'The angle reader', error: 2.2, power: 0.63, color: 0xda9654, opening: 'Your street, your first shot.', win: 'That was a good line. Again?', lose: 'All right. You earned that one.' };
const salma: Rival = { name: 'Salma', title: 'The coastal champion', error: 1.6, power: 0.58, color: 0x59b4ae, opening: 'Watch the wet patches.', win: 'The ground has a say here.', lose: 'You read the street better than I did.' };
const youssef: Rival = { name: 'Youssef', title: 'Champion of the hara', error: 0.9, power: 0.72, color: 0xc394dd, opening: 'One last match. Make it a good one.', win: 'Come back. This circle is not going anywhere.', lose: 'Your circle now. Well played.' };
const rack: [number, number][] = [[-0.052, 0.035], [0.046, -0.018], [0, -0.11], [-0.16, -0.075], [0.176, -0.104], [0.112, 0.148], [-0.19, 0.172]];

export const LEVELS: Level[] = [
  { id: 'first-flick', arena: 'nour', name: 'First Flick', subtitle: 'Your first two marbles.', rule: 'knockout', target: 2, shots: 5, silver: 4, gold: 2, ringRadius: 0.44, layout: layout([[-0.052, 0.035], [0.15, -0.10], [-0.18, -0.14]]), barriers: [], pockets: [] },
  { id: 'clean-sweep', arena: 'nour', name: 'Clean Sweep', subtitle: 'Leave nothing inside the chalk.', rule: 'knockout', target: 5, shots: 8, silver: 6, gold: 5, ringRadius: 0.44, layout: layout([[-0.055, 0.035], [0.06, -0.03], [-0.15, -0.14], [0.18, -0.13], [0.13, 0.15]]), barriers: [], pockets: [], requires: 'first-flick' },
  { id: 'off-the-wall', arena: 'workshop', name: 'Off the Wall', subtitle: 'A rail first. A marble second.', rule: 'bank', target: 1, shots: 6, silver: 4, gold: 2, ringRadius: 0.44, layout: layout([[0.035, -0.07], [-0.11, 0.02]]), barriers: [{ x: -0.58, z: 0.04, width: 0.045, depth: 1.2, height: 0.12, material: 'wood', bank: true }, { x: 0.58, z: 0.04, width: 0.045, depth: 1.2, height: 0.12, material: 'wood', bank: true }], pockets: [] },
  { id: 'mariams-challenge', arena: 'workshop', name: "Mariam's Challenge", subtitle: 'Beat the neighborhood angle reader.', rule: 'duel', target: 4, shots: 9, silver: 6, gold: 4, ringRadius: 0.44, layout: layout(rack), barriers: [], pockets: [], requires: 'off-the-wall', rival: mariam },
  { id: 'the-well', arena: 'courtyard', name: 'The Well', subtitle: 'One target. One small pocket.', rule: 'pocket', target: 1, shots: 6, silver: 4, gold: 2, ringRadius: 0.46, layout: layout([[0, -0.06], [0.18, 0.08]], [0, 0.69]), barriers: [], pockets: [{ x: 0, z: -0.39, radius: 0.082 }] },
  { id: 'needle-thread', arena: 'courtyard', name: 'Thread the Needle', subtitle: 'Two gates. No room to rush.', rule: 'pocket', target: 2, shots: 8, silver: 6, gold: 4, ringRadius: 0.48, layout: layout([[-0.14, -0.07], [0.14, -0.07], [0, 0.10]], [0, 0.73]), barriers: [{ x: -0.30, z: -0.24, width: 0.12, depth: 0.075, height: 0.07, material: 'stone' }, { x: 0, z: -0.24, width: 0.12, depth: 0.075, height: 0.07, material: 'stone' }, { x: 0.30, z: -0.24, width: 0.12, depth: 0.075, height: 0.07, material: 'stone' }], pockets: [{ x: -0.14, z: -0.4, radius: 0.084 }, { x: 0.14, z: -0.4, radius: 0.084 }], requires: 'the-well' },
  { id: 'between-puddles', arena: 'alexandria', name: 'Between the Puddles', subtitle: 'Fast stone. Slow water.', rule: 'knockout', target: 3, shots: 7, silver: 5, gold: 3, ringRadius: 0.47, layout: layout([[-0.045, 0.01], [0.16, -0.11], [-0.17, -0.15], [0.10, 0.19], [-0.23, 0.12]]), barriers: [], pockets: [] },
  { id: 'coastal-rival', arena: 'alexandria', name: 'The Coastal Rival', subtitle: 'Salma knows every seam in the paving.', rule: 'duel', target: 4, shots: 9, silver: 6, gold: 4, ringRadius: 0.47, layout: layout(rack), barriers: [], pockets: [], requires: 'between-puddles', rival: salma },
  { id: 'soft-ground', arena: 'delta', name: 'Soft Ground', subtitle: 'Choose a route through the sand.', rule: 'knockout', target: 3, shots: 7, silver: 5, gold: 3, ringRadius: 0.46, layout: layout([[-0.04, 0.02], [0.18, -0.12], [-0.19, -0.13], [0.16, 0.17]]), barriers: [], pockets: [] },
  { id: 'long-way-home', arena: 'delta', name: 'The Long Way Home', subtitle: 'The straight line is not always the best one.', rule: 'knockout', target: 3, shots: 8, silver: 6, gold: 4, ringRadius: 0.49, layout: layout([[-0.20, -0.08], [0.20, -0.10], [-0.11, -0.22], [0.12, -0.26]], [0, 0.74]), barriers: [{ x: 0, z: 0.18, width: 0.29, depth: 0.095, height: 0.065, angle: -0.17, material: 'wood' }, { x: 0.53, z: -0.02, width: 0.04, depth: 0.80, height: 0.09, material: 'wood', bank: true }], pockets: [], requires: 'soft-ground' },
  { id: 'under-the-lights', arena: 'festival', name: 'Under the Lights', subtitle: 'Warm up before the final.', rule: 'pocket', target: 2, shots: 8, silver: 5, gold: 3, ringRadius: 0.47, layout: layout([[-0.13, -0.05], [0.13, -0.05], [0, 0.12]]), barriers: [], pockets: [{ x: -0.17, z: -0.39, radius: 0.09 }, { x: 0.17, z: -0.39, radius: 0.09 }] },
  { id: 'king-of-the-hara', arena: 'festival', name: 'King of the Hara', subtitle: 'Take the circle from Youssef.', rule: 'duel', target: 5, shots: 10, silver: 7, gold: 5, ringRadius: 0.48, layout: layout([...rack, [-0.09, -0.24], [0.13, -0.26]]), barriers: [], pockets: [], requires: 'under-the-lights', rival: youssef },
];

export { MARBLE_SKINS as SKINS } from './marbles.ts';

export function arenaById(id: ArenaId) { return ARENAS.find((arena) => arena.id === id)!; }
export function levelById(id: string) { return LEVELS.find((level) => level.id === id); }
export function medalFor(level: Level, shots: number, won: boolean) {
  if (!won) return 0;
  return shots <= level.gold ? 3 : shots <= level.silver ? 2 : 1;
}
export function dailyLevel(date = new Date()) {
  const day = Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86400000);
  const candidates = LEVELS.filter((level) => level.rule !== 'duel');
  return { key: date.toISOString().slice(0, 10), level: candidates[((day * 7 + 3) % candidates.length + candidates.length) % candidates.length] };
}