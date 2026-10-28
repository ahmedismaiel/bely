import type { ArenaId } from './levels';

export type ExperimentMode = 'trail' | 'pulse' | 'sky' | 'gravity' | 'sprint' | 'courier';
export type Experiment = { id: string; mode: ExperimentMode; stage: number; difficulty: number; arena: ArenaId; seed: number; name: string; nameAr: string; pitch: string; pitchAr: string; status: 'playable-generated' };
export const EXPERIMENT_MODES = [
  { id: 'trail' as const, name: 'Marble Odyssey', ar: 'رحلة البلّية', icon: 'route', pitch: 'Third-person rolling, terrain, gates, and checkpoints.', pitchAr: 'تدحرج من منظور ثالث فوق التضاريس وعبر البوابات ونقاط الحفظ.' },
  { id: 'pulse' as const, name: 'Pulse Arena', ar: 'ساحة النبضة', icon: 'zap', pitch: 'Knock targets out with a limited radial shockwave.', pitchAr: 'أخرج الأهداف باستخدام نبضة دفع محدودة.' },
  { id: 'sky' as const, name: 'Sky Ribbons', ar: 'شرائط السماء', icon: 'wind', pitch: 'Jump, glide, and thread airborne rings.', pitchAr: 'اقفز وحلّق واعبر الحلقات في الهواء.' },
  { id: 'gravity' as const, name: 'Moon Marble', ar: 'بلّية القمر', icon: 'orbit', pitch: 'Low gravity, long jumps, and slippery landings.', pitchAr: 'جاذبية منخفضة وقفزات طويلة وهبوط زلق.' },
  { id: 'sprint' as const, name: 'Last Light', ar: 'قبل آخر ضوء', icon: 'timer', pitch: 'Race the clock through increasingly technical terrain.', pitchAr: 'سابق الوقت فوق تضاريس تزداد صعوبة.' },
  { id: 'courier' as const, name: 'The Lost Tin', ar: 'العلبة الضائعة', icon: 'package', pitch: 'Collect the missing marbles and bring them home.', pitchAr: 'اجمع البلي الضائع وأعده إلى البيت.' },
];
const places = [
  { arena: 'nour' as const, name: 'Pyramid Rooftops', ar: 'سطوح الأهرامات' },
  { arena: 'alexandria' as const, name: 'Coastal Run', ar: 'طريق البحر' },
  { arena: 'courtyard' as const, name: 'Citadel Steps', ar: 'درجات القلعة' },
  { arena: 'delta' as const, name: 'Riverbank', ar: 'ضفة النيل' },
  { arena: 'festival' as const, name: 'Lantern Route', ar: 'طريق الفوانيس' },
];
const twists = [
  { en: 'Gentle slopes', ar: 'منحدرات هادئة' }, { en: 'Offset gates', ar: 'بوابات متعرجة' },
  { en: 'Alternate terrain line', ar: 'مسار تضاريس بديل' }, { en: 'Precision route', ar: 'طريق يحتاج دقة' },
  { en: 'Narrow passage', ar: 'ممر ضيق' }, { en: 'High ridges', ar: 'مرتفعات عالية' },
  { en: 'Long way around', ar: 'الطريق الأطول' }, { en: 'Final ascent', ar: 'الصعود الأخير' },
];

export const EXPERIMENTS: Experiment[] = EXPERIMENT_MODES.flatMap((mode, modeIndex) => Array.from({ length: 40 }, (_, index) => {
  const place = places[index % places.length];
  const twist = twists[index % twists.length];
  return {
    id: `${mode.id}-${String(index + 1).padStart(2, '0')}`, mode: mode.id, stage: index + 1,
    difficulty: Math.floor(index / 8) + 1, arena: place.arena, seed: 4000 + modeIndex * 197 + index * 31,
    name: `${place.name} / ${index + 1}`, nameAr: `${place.ar} / ${index + 1}`,
    pitch: `${mode.pitch} ${twist.en}.${index >= 16 ? ' Moving barriers.' : ''}${index >= 24 ? ' Crosswind.' : ''}`, pitchAr: `${mode.pitchAr} ${twist.ar}.${index >= 16 ? ' حواجز متحركة.' : ''}${index >= 24 ? ' رياح جانبية.' : ''}`, status: 'playable-generated' as const,
  };
}));

export function experimentHeight(experiment: Experiment, horizontal: number, depth: number) {
  const phase = (experiment.seed % 31) * 0.17;
  const progression = Math.max(0, Math.min(1, (1.3 - depth) / 10));
  const ramp = Math.max(0, progression - 0.35) * (experiment.difficulty * 0.12);
  const waves = (Math.sin(depth * (0.8 + experiment.difficulty * 0.07) + phase) + 1) * 0.06 * experiment.difficulty;
  const crossing = Math.sin(horizontal * 1.1 + phase) * Math.sin(depth * 1.3) * 0.038 * experiment.difficulty;
  const banks = Math.pow(Math.abs(horizontal) / 2.5, 4) * 0.12 * experiment.difficulty;
  return 0.018 + Math.max(0, waves + crossing + ramp + banks) * Math.min(1, progression * 5);
}

export function routePosition(experiment: Experiment, index: number) {
  const depth = -0.7 - index * 2.3;
  const horizontal = Math.sin(index * 1.47 + experiment.seed * 0.1) * (0.35 + experiment.difficulty * 0.10);
  return { x: horizontal, z: depth, y: experimentHeight(experiment, horizontal, depth) };
}