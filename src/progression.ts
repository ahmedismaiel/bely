import { ARENAS, LEVELS, SKINS, arenaById, levelById } from './levels.ts';
import type { Level } from './levels.ts';

export type Result = { stars: number; shots: number; score: number; completedAt: string };
export type Progress = { version: 1; results: Record<string, Result>; equipped: string; lastLevel: string; daily: Record<string, Result>; settings: { sound: boolean; assists: boolean } };
export const SAVE_KEY = 'bely-journey-v1';

export function newProgress(): Progress {
  return { version: 1, results: {}, equipped: 'nile', lastLevel: LEVELS[0].id, daily: {}, settings: { sound: true, assists: true } };
}
export function totalStars(progress: Progress) {
  return LEVELS.reduce((sum, level) => sum + (progress.results[level.id]?.stars ?? 0), 0);
}
export function canPlay(progress: Progress, level: Level) {
  const district = arenaById(level.arena);
  return totalStars(progress) >= district.unlockStars && (!level.requires || (progress.results[level.requires]?.stars ?? 0) > 0);
}
export function canEquip(progress: Progress, id: string) {
  const skin = SKINS.find((item) => item.id === id);
  if (!skin) return false;
  return totalStars(progress) >= skin.stars && (!skin.requires || (progress.results[skin.requires]?.stars ?? 0) > 0);
}
export function rank(progress: Progress) {
  const reputation = totalStars(progress) * 20 + Object.keys(progress.results).length * 40;
  const thresholds = [{ name: 'New Face', points: 0 }, { name: 'Street Regular', points: 100 }, { name: 'Sharp Shooter', points: 250 }, { name: 'Block Champion', points: 450 }, { name: 'Hara Legend', points: 750 }];
  const index = thresholds.findLastIndex((entry) => reputation >= entry.points);
  return { name: thresholds[index].name, reputation, next: thresholds[index + 1] ?? null };
}
export function recordResult(progress: Progress, level: Level, stars: number, shots: number, score: number, dailyKey?: string) {
  if (!Number.isInteger(stars) || stars < 1 || stars > 3 || !Number.isInteger(shots) || shots < 1 || !Number.isInteger(score) || score < 0) return { progress, improved: false, unlocked: [] as string[], rewards: [] as string[] };
  if (!dailyKey && !canPlay(progress, level)) return { progress, improved: false, unlocked: [] as string[], rewards: [] as string[] };
  const records = dailyKey ? progress.daily : progress.results;
  const key = dailyKey ?? level.id;
  const previous = records[key];
  const improved = !previous || stars > previous.stars || (stars === previous.stars && shots < previous.shots);
  if (!improved) return { progress, improved: false, unlocked: [] as string[], rewards: [] as string[] };
  const result = { stars, shots, score, completedAt: new Date().toISOString() };
  const next: Progress = {
    ...progress,
    results: dailyKey ? progress.results : { ...progress.results, [key]: result },
    daily: dailyKey ? { ...progress.daily, [key]: result } : progress.daily,
    lastLevel: dailyKey ? progress.lastLevel : level.id,
  };
  const unlocked = ARENAS.filter((arena) => totalStars(progress) < arena.unlockStars && totalStars(next) >= arena.unlockStars).map((arena) => arena.id);
  const rewards = SKINS.filter((skin) => !canEquip(progress, skin.id) && canEquip(next, skin.id)).map((skin) => skin.id);
  return { progress: next, improved, unlocked, rewards };
}

function parseResult(value: unknown): Result | undefined {
  if (!value || typeof value !== 'object') return;
  const result = value as Partial<Result>;
  if (!Number.isInteger(result.stars) || result.stars! < 1 || result.stars! > 3 || !Number.isInteger(result.shots) || result.shots! < 1 || result.shots! > 1000 || !Number.isInteger(result.score) || result.score! < 0 || result.score! > 12) return;
  return { stars: result.stars!, shots: result.shots!, score: result.score!, completedAt: typeof result.completedAt === 'string' ? result.completedAt : '' };
}

export function parseProgress(serialized: string | null): Progress {
  const clean = newProgress();
  if (!serialized) return clean;
  try {
    const candidate = JSON.parse(serialized);
    if (!candidate || candidate.version !== 1) return clean;
    if (candidate.results && typeof candidate.results === 'object') {
      for (const level of LEVELS) {
        const result = parseResult(candidate.results[level.id]);
        if (result) clean.results[level.id] = result;
      }
    }
    if (candidate.daily && typeof candidate.daily === 'object') {
      for (const [key, value] of Object.entries(candidate.daily).slice(-45)) {
        const result = parseResult(value);
        if (/^\d{4}-\d{2}-\d{2}$/.test(key) && result) clean.daily[key] = result;
      }
    }
    if (typeof candidate.equipped === 'string' && canEquip(clean, candidate.equipped)) clean.equipped = candidate.equipped;
    const lastLevel = levelById(candidate.lastLevel);
    if (lastLevel && canPlay(clean, lastLevel)) clean.lastLevel = lastLevel.id;
    if (candidate.settings && typeof candidate.settings === 'object') {
      if (typeof candidate.settings.sound === 'boolean') clean.settings.sound = candidate.settings.sound;
      if (typeof candidate.settings.assists === 'boolean') clean.settings.assists = candidate.settings.assists;
    }
  } catch { return newProgress(); }
  return clean;
}

export function nextLevel(progress: Progress, currentId: string) {
  const currentIndex = LEVELS.findIndex((level) => level.id === currentId);
  const ordered = [...LEVELS.slice(currentIndex + 1), ...LEVELS.slice(0, currentIndex + 1)];
  return ordered.find((level) => canPlay(progress, level) && !progress.results[level.id]) ?? ordered.find((level) => canPlay(progress, level)) ?? LEVELS[0];
}