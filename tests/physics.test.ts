import test from 'node:test';
import assert from 'node:assert/strict';
import { createMatch } from '../src/physics.ts';
import { marbleLayout } from '../src/glass.ts';
import { ARENAS, LEVELS, SKINS, dailyLevel, medalFor } from '../src/levels.ts';
import { canEquip, canPlay, newProgress, nextLevel, parseProgress, recordResult, totalStars } from '../src/progression.ts';
import { EXPERIMENTS, EXPERIMENT_MODES, experimentHeight, routePosition } from '../src/experiments.ts';

function settle(match: ReturnType<typeof createMatch>, observe?: () => void) {
  let frames = 0;
  while (match.snapshot().active && frames < 1200) {
    match.step(1 / 60);
    observe?.();
    for (const body of match.bodies) {
      assert.ok(Number.isFinite(body.position.x + body.position.y + body.position.z));
      assert.ok(body.position.y > -0.01, 'a marble must not tunnel through the ground');
    }
    frames++;
  }
  assert.equal(match.snapshot().active, false, 'a shot must return to a settled, playable state');
}

test('a flick transfers momentum, knocks out targets, and settles', () => {
  let contacts = 0;
  const match = createMatch(() => contacts++);
  assert.equal(match.shoot(-6, 0.7), true);
  assert.equal(match.shoot(-6, 0.7), false, 'cannot shoot during an active turn');
  settle(match);
  assert.ok(contacts > 0, 'the shooter must collide with a target');
  assert.ok(match.snapshot().score > 0, 'the aimed shot must knock a target outside the circle');
  assert.equal(match.snapshot().shots, 1);
  const collected = match.bodies.map((_, index) => index).filter((index) => !match.isVisible(index));
  if (!match.snapshot().roundOver) {
    match.shoot(90, 0.2);
    collected.forEach((index) => assert.equal(match.isVisible(index), false, 'collected marbles must not reappear on the next shot'));
    settle(match);
  }
});

test('reset restores captured bodies, positions, and score', () => {
  const match = createMatch();
  match.shoot(-6, 0.7);
  settle(match);
  match.reset();
  assert.equal(match.snapshot().score, 0);
  assert.equal(match.snapshot().shots, 0);
  match.bodies.forEach((body, index) => {
    assert.ok(match.isVisible(index));
    assert.equal(body.position.x, marbleLayout[index].position[0]);
    assert.equal(body.position.z, marbleLayout[index].position[2]);
    assert.equal(body.velocity.length(), 0);
  });
});

test('seven-shot challenge ends exactly at its shot budget', () => {
  const match = createMatch();
  match.reset('challenge');
  for (let shot = 0; shot < 7; shot++) {
    assert.equal(match.shoot(90, 0.2), true);
    settle(match);
  }
  assert.equal(match.snapshot().shots, 7);
  assert.equal(match.snapshot().roundOver, true);
  assert.equal(match.shoot(0, 0.5), false);
  match.reset();
  assert.equal(match.snapshot().roundOver, false);
});

test('invalid inputs do not corrupt the simulation', () => {
  const match = createMatch();
  assert.equal(match.shoot(Number.NaN, 0.5), false);
  assert.equal(match.shoot(0, Number.POSITIVE_INFINITY), false);
  assert.equal(match.snapshot().shots, 0);
});

test('twelve events have valid distinct rules and physically separated starting marbles', () => {
  assert.equal(ARENAS.length, 6);
  assert.equal(LEVELS.length, 12);
  assert.equal(new Set(LEVELS.map((level) => level.id)).size, LEVELS.length);
  for (const level of LEVELS) {
    assert.ok(level.layout.length > level.target && level.layout.length <= 12);
    assert.ok(level.gold <= level.silver && level.silver <= level.shots);
    assert.ok(ARENAS.some((arena) => arena.id === level.arena));
    for (let first = 0; first < level.layout.length; first++) {
      for (let second = first + 1; second < level.layout.length; second++) {
        const firstBall = level.layout[first];
        const secondBall = level.layout[second];
        assert.ok(Math.hypot(firstBall.position[0] - secondBall.position[0], firstBall.position[2] - secondBall.position[2]) > firstBall.radius + secondBall.radius, `${level.id}: starting marbles overlap`);
      }
    }
    if (level.rule === 'pocket') assert.ok(level.pockets.length > 0);
    if (level.rule === 'bank') assert.ok(level.barriers.some((barrier) => barrier.bank));
    if (level.rule === 'duel') assert.ok(level.rival);
  }
});

test('medals unlock a route and cosmetic rewards without repeat-win farming', () => {
  let progress = newProgress();
  assert.equal(canPlay(progress, LEVELS[0]), true);
  assert.equal(canPlay(progress, LEVELS[1]), false);
  assert.equal(canPlay(progress, LEVELS[2]), false);
  const first = recordResult(progress, LEVELS[0], medalFor(LEVELS[0], 2, true), 2, 2);
  progress = first.progress;
  assert.equal(totalStars(progress), 3);
  assert.ok(first.unlocked.includes('workshop'));
  assert.ok(first.rewards.includes('honey'));
  assert.equal(canPlay(progress, LEVELS[1]), true);
  assert.equal(canPlay(progress, LEVELS[2]), true);
  assert.equal(nextLevel(progress, LEVELS[0].id).id, LEVELS[1].id);
  assert.equal(recordResult(progress, LEVELS[0], 1, 5, 2).improved, false);
  assert.equal(recordResult(progress, LEVELS[0], 3, 2, 2).progress, progress);
  assert.equal(canEquip(progress, 'champion'), false);
  assert.equal(canEquip(progress, 'honey'), true);
  assert.equal(recordResult(progress, LEVELS[11], 3, 1, 5).improved, false);
});

test('save parsing is resilient and daily trials do not bypass journey locks', () => {
  const fresh = newProgress();
  assert.deepEqual(parseProgress('{invalid'), fresh);
  const invalid = parseProgress(JSON.stringify({ version: 1, equipped: 'champion', lastLevel: 'missing', results: { 'first-flick': { stars: 400, shots: -1 } } }));
  assert.deepEqual(invalid, fresh);
  const daily = dailyLevel(new Date('2026-10-26T12:00:00Z'));
  assert.equal(daily.key, '2026-10-26');
  assert.equal(dailyLevel(new Date('2026-10-26T23:59:00Z')).level.id, daily.level.id);
  const updated = recordResult(fresh, daily.level, 3, 2, daily.level.target, daily.key).progress;
  assert.equal(totalStars(updated), 0);
  assert.equal(updated.daily[daily.key].stars, 3);
  assert.deepEqual(parseProgress(JSON.stringify(updated)), updated);
  assert.ok(SKINS.every((skin) => skin.stars >= 0));
});

test('one hundred collectible marbles have unique identities and ten finishes', () => {
  assert.equal(SKINS.length, 100);
  assert.equal(new Set(SKINS.map((skin) => skin.id)).size, 100);
  assert.equal(new Set(SKINS.map((skin) => skin.name)).size, 100);
  assert.equal(new Set(SKINS.map((skin) => skin.finish)).size, 10);
  for (const skin of SKINS) {
    assert.ok(skin.nameAr.length > 0);
    assert.ok(Number.isFinite(skin.color + skin.secondary));
    assert.ok(skin.stars >= 0 && skin.stars <= 36);
  }
  for (const id of ['nile', 'honey', 'mint', 'pearl', 'rose', 'midnight', 'champion']) assert.ok(SKINS.some((skin) => skin.id === id));
});

test('authored pocket rules collect a target rather than ordinary ring exits', () => {
  const level = LEVELS.find((entry) => entry.id === 'the-well')!;
  const match = createMatch(() => {}, level);
  match.shoot(0, 0.4);
  settle(match);
  assert.ok(match.snapshot().score >= 1);
  assert.equal(match.snapshot().won, true);
  assert.equal(match.snapshot().roundOver, true);
});

test('bank events reject a direct knockout and remain replayable', () => {
  const level = LEVELS.find((entry) => entry.rule === 'bank')!;
  const match = createMatch(() => {}, level);
  match.shoot(0, 0.7);
  settle(match);
  assert.equal(match.snapshot().score, 0);
  assert.equal(match.snapshot().banked, false);
  assert.equal(match.snapshot().roundOver, false);
  assert.ok(match.bodies.every((_, index) => match.isVisible(index)));
});

test('a rail-first shot can complete the authored bank event', () => {
  const level = LEVELS.find((entry) => entry.rule === 'bank')!;
  const match = createMatch(() => {}, level);
  const rail = level.barriers[0];
  const home = level.layout[0];
  const target = level.layout[1];
  const reflectionLine = rail.x + rail.width / 2 + home.radius;
  const reflectedDistance = home.position[0] - reflectionLine + (target.position[0] - reflectionLine) / 0.78;
  const angle = Math.atan2(-reflectedDistance, home.position[2] - target.position[2]) * 180 / Math.PI;
  match.shoot(angle, 0.72);
  let minimumX = home.position[0];
  let minimumZ = home.position[2];
  settle(match, () => { minimumX = Math.min(minimumX, match.bodies[0].position.x); minimumZ = Math.min(minimumZ, match.bodies[0].position.z); });
  assert.equal(match.snapshot().lastShot?.bank, true, JSON.stringify({ angle, minimumX, minimumZ, state: match.snapshot() }));
  assert.ok(match.snapshot().score >= 1, 'the bank event must have a legal winning shot');
  assert.equal(match.snapshot().won, true);
});

test('rivals take legal simulated turns and cannot be played by the user', () => {
  const level = LEVELS.find((entry) => entry.id === 'mariams-challenge')!;
  const match = createMatch(() => {}, level);
  match.shoot(90, 0.12);
  settle(match);
  assert.equal(match.snapshot().turn, 'rival');
  assert.equal(match.shoot(0, 0.6), false);
  const shot = match.opponentShot()!;
  assert.ok(Number.isFinite(shot.angle + shot.power));
  assert.equal(match.shoot(shot.angle, shot.power, 'rival'), true);
  settle(match);
  assert.equal(match.snapshot().rivalShots, 1);
  assert.equal(match.snapshot().turn, 'player');
  assert.ok(match.snapshot().rivalScore > 0);
});

test('changing events rebuilds board geometry and discards old scores', () => {
  const match = createMatch();
  match.setLevel(LEVELS[0]);
  assert.equal(match.bodies.length, LEVELS[0].layout.length);
  assert.equal(match.snapshot().goal, 2);
  match.shoot(-6, 0.7);
  settle(match);
  match.setLevel(LEVELS[11]);
  assert.equal(match.bodies.length, LEVELS[11].layout.length);
  assert.equal(match.snapshot().shots, 0);
  assert.equal(match.snapshot().score, 0);
  assert.equal(match.snapshot().turn, 'player');
});

test('two hundred forty generated scenarios have six modes and five difficulty tiers', () => {
  assert.equal(EXPERIMENTS.length, 240);
  assert.equal(new Set(EXPERIMENTS.map((entry) => entry.id)).size, 240);
  for (const mode of EXPERIMENT_MODES) assert.equal(EXPERIMENTS.filter((entry) => entry.mode === mode.id).length, 40);
  for (const experiment of EXPERIMENTS) {
    assert.ok(experiment.difficulty >= 1 && experiment.difficulty <= 5);
    for (let gate = 0; gate < 4; gate++) {
      const point = routePosition(experiment, gate);
      assert.ok(Number.isFinite(point.x + point.y + point.z));
      assert.ok(Math.abs(point.x) < 1.2);
      assert.ok(point.y >= 0 && point.y < 3);
    }
    assert.equal(experimentHeight(experiment, 0, 1.3), 0.018);
  }
});