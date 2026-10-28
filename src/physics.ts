import * as CANNON from 'cannon-es';
import { marbleLayout, RING_RADIUS } from './glass.ts';
import { arenaById } from './levels.ts';
import type { Barrier, Level, MarbleDefinition } from './levels.ts';

export type MatchMode = 'practice' | 'challenge';
export type Actor = 'player' | 'rival';

export function createMatch(onImpact: (speed: number) => void = () => {}, initialLevel?: Level) {
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.81, 0), allowSleep: true });
  world.broadphase = new CANNON.NaiveBroadphase();
  (world.solver as CANNON.GSSolver).iterations = 16;
  (world.solver as CANNON.GSSolver).tolerance = 0.000001;
  const glass = new CANNON.Material('glass');
  const soil = new CANNON.Material('packed soil');
  world.addContactMaterial(new CANNON.ContactMaterial(glass, glass, {
    friction: 0.025, restitution: 0.78, contactEquationStiffness: 1e8, contactEquationRelaxation: 3,
  }));
  const groundContact = new CANNON.ContactMaterial(glass, soil, {
    friction: 0.24, restitution: 0.16, contactEquationStiffness: 1e8, contactEquationRelaxation: 3,
  });
  world.addContactMaterial(groundContact);
  const railMaterials = Object.fromEntries(['wood', 'stone', 'metal'].map((name) => [name, new CANNON.Material(name)])) as Record<Barrier['material'], CANNON.Material>;
  for (const [name, material] of Object.entries(railMaterials)) {
    world.addContactMaterial(new CANNON.ContactMaterial(glass, material, { friction: 0.12, restitution: name === 'wood' ? 0.78 : name === 'metal' ? 0.85 : 0.65 }));
  }
  const floor = new CANNON.Body({ mass: 0, material: soil, shape: new CANNON.Plane() });
  floor.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  world.addBody(floor);
  for (const side of [-1, 1]) {
    const curb = new CANNON.Body({ mass: 0, material: railMaterials.stone, shape: new CANNON.Box(new CANNON.Vec3(0.025, 0.09, 10)) });
    curb.position.set(side * 1.5, 0.09, 0);
    world.addBody(curb);
  }
  let level = initialLevel;
  let definitions: MarbleDefinition[] = (level?.layout ?? marbleLayout) as MarbleDefinition[];
  let bodies: CANNON.Body[] = [];
  const bodyIndices = new Map<number, number>();
  const barrierBodies: CANNON.Body[] = [];
  const bankBodies = new Set<number>();
  const bankTargets = new Set<number>();
  const captured = new Map<number, Actor>();
  const uncredited = new Set<number>();
  let active = false;
  let mode: MatchMode = 'practice';
  let shots = 0;
  let rivalShots = 0;
  let turn: Actor = 'player';
  let settledTime = 0;
  let shotTime = 0;
  let roundOver = false;
  let banked = false;
  let foul = false;
  let capturesAtStart = 0;
  let lastShot: { actor: Actor; captured: number; bank: boolean; foul: boolean; serial: number } | null = null;

  function buildBoard() {
    bodies.forEach((body) => world.removeBody(body));
    barrierBodies.forEach((body) => world.removeBody(body));
    barrierBodies.length = 0;
    bankBodies.clear();
    bodyIndices.clear();
    definitions = (level?.layout ?? marbleLayout) as MarbleDefinition[];
    const arena = level ? arenaById(level.arena) : null;
    groundContact.friction = arena?.friction ?? 0.24;
    for (const barrier of level?.barriers ?? []) {
      const body = new CANNON.Body({ mass: 0, material: railMaterials[barrier.material], shape: new CANNON.Box(new CANNON.Vec3(barrier.width / 2, barrier.height / 2, barrier.depth / 2)) });
      body.position.set(barrier.x, barrier.height / 2, barrier.z);
      body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), barrier.angle ?? 0);
      world.addBody(body);
      barrierBodies.push(body);
      if (barrier.bank) bankBodies.add(body.id);
    }
    bodies = definitions.map((definition, index) => {
      const body = new CANNON.Body({
        mass: (4 / 3) * Math.PI * definition.radius ** 3 * 2500,
        material: glass,
        shape: new CANNON.Sphere(definition.radius),
        linearDamping: 0.24,
        angularDamping: 0.28,
        allowSleep: true,
        sleepSpeedLimit: 0.045,
        sleepTimeLimit: 0.24,
      });
      bodyIndices.set(body.id, index);
      body.addEventListener('collide', (event: { body: CANNON.Body; contact: CANNON.ContactEquation }) => {
        if (index === 0 && bankBodies.has(event.body.id)) banked = true;
        const otherIndex = bodyIndices.get(event.body.id);
        if (otherIndex !== undefined) {
          if (level?.rule === 'bank') {
            if (index === 0 && banked && otherIndex > 0) bankTargets.add(otherIndex);
            if (otherIndex === 0 && banked && index > 0) bankTargets.add(index);
            if (bankTargets.has(index) && otherIndex > 0) bankTargets.add(otherIndex);
          }
          if (body.id < event.body.id) {
            const speed = Math.abs(event.contact.getImpactVelocityAlongNormal());
            if (speed > 0.05) onImpact(speed);
          }
        }
      });
      world.addBody(body);
      return body;
    });
  }

  world.addEventListener('preStep', () => {
    const arena = level ? arenaById(level.arena) : null;
    for (let index = 0; index < bodies.length; index++) {
      const body = bodies[index];
      if (body.sleepState === CANNON.Body.SLEEPING || body.position.y > definitions[index].radius + 0.006) continue;
      const speed = Math.hypot(body.velocity.x, body.velocity.z);
      if (speed > 0.008) {
        let drag = arena?.rollingDrag ?? 0.38;
        for (const zone of arena?.zones ?? []) {
          if (Math.hypot(body.position.x - zone.x, body.position.z - zone.z) < zone.radius) drag += zone.drag;
        }
        const rollingResistance = body.mass * drag;
        body.force.x -= body.velocity.x / speed * rollingResistance;
        body.force.z -= body.velocity.z / speed * rollingResistance;
      } else if (Math.abs(body.velocity.y) < 0.035) {
        body.velocity.setZero();
        body.angularVelocity.setZero();
        body.sleep();
      }
    }
  });

  function restoreBody(index: number) {
    const body = bodies[index];
    const definition = definitions[index];
    if (!world.bodies.includes(body)) world.addBody(body);
    body.position.set(definition.position[0], definition.radius, definition.position[2]);
    body.previousPosition.copy(body.position);
    body.interpolatedPosition.copy(body.position);
    body.quaternion.setFromEuler(index * 0.41, index * 0.73, index * 0.91);
    body.previousQuaternion.copy(body.quaternion);
    body.interpolatedQuaternion.copy(body.quaternion);
    body.velocity.setZero();
    body.angularVelocity.setZero();
    body.force.setZero();
    body.torque.setZero();
    body.aabbNeedsUpdate = true;
    body.sleep();
  }

  function reset(nextMode = mode) {
    mode = nextMode;
    captured.clear();
    uncredited.clear();
    bankTargets.clear();
    shots = 0;
    rivalShots = 0;
    turn = 'player';
    active = false;
    roundOver = false;
    settledTime = 0;
    shotTime = 0;
    banked = false;
    foul = false;
    lastShot = null;
    world.accumulator = 0;
    bodies.forEach((_, index) => restoreBody(index));
  }

  function shoot(angle: number, power: number, actor: Actor = 'player') {
    if (active || roundOver || actor !== turn || !Number.isFinite(angle) || !Number.isFinite(power)) return false;
    const strength = Math.max(0.05, Math.min(1, power));
    const speed = 0.75 + strength * 3.25;
    const heading = angle * Math.PI / 180;
    const shooter = bodies[0];
    bodies.forEach((body, index) => { if (!captured.has(index)) body.wakeUp(); });
    shooter.velocity.set(Math.sin(heading) * speed, 0.015, -Math.cos(heading) * speed);
    shooter.angularVelocity.set(shooter.velocity.z / definitions[0].radius * 0.25, 0, -shooter.velocity.x / definitions[0].radius * 0.25);
    if (actor === 'player') shots++;
    else rivalShots++;
    settledTime = 0;
    shotTime = 0;
    capturesAtStart = captured.size;
    banked = false;
    foul = false;
    bankTargets.clear();
    uncredited.clear();
    active = true;
    return true;
  }

  function scores() {
    let player = 0;
    let rival = 0;
    for (const actor of captured.values()) {
      if (actor === 'player') player++;
      else rival++;
    }
    return { player, rival };
  }

  function finishShot() {
    for (const index of captured.keys()) {
      if (world.bodies.includes(bodies[index])) world.removeBody(bodies[index]);
    }
    for (const index of uncredited) restoreBody(index);
    restoreBody(0);
    lastShot = { actor: turn, captured: captured.size - capturesAtStart, bank: banked, foul, serial: shots + rivalShots };
    active = false;
    const score = scores();
    const target = level?.target ?? definitions.length - 1;
    const budget = level?.shots ?? (mode === 'challenge' ? 7 : Number.POSITIVE_INFINITY);
    if (level?.rule === 'duel') {
      roundOver = score.player >= target || score.rival >= target || captured.size === definitions.length - 1 || (shots >= budget && rivalShots >= budget);
      if (!roundOver) {
        turn = turn === 'player' ? 'rival' : 'player';
        if (turn === 'player' && shots >= budget) turn = 'rival';
        if (turn === 'rival' && rivalShots >= budget) turn = 'player';
      }
    } else roundOver = score.player >= target || shots >= budget;
  }

  function step(elapsed: number) {
    if (!active) return;
    const delta = Math.max(0, Math.min(elapsed, 1 / 15));
    world.step(1 / 240, delta, 16);
    shotTime += delta;
    let moving = false;
    bodies.forEach((body, index) => {
      if (!world.bodies.includes(body)) return;
      if (level?.rule === 'pocket') {
        const pocket = level.pockets.find((hole) => Math.hypot(body.position.x - hole.x, body.position.z - hole.z) < hole.radius - definitions[index].radius * 0.20);
        if (pocket && body.velocity.length() < 2.8 && !captured.has(index)) {
          if (index === 0) foul = true;
          else captured.set(index, turn);
          body.velocity.setZero();
          body.angularVelocity.setZero();
          body.sleep();
          world.removeBody(body);
          return;
        }
        if (index > 0 && Math.hypot(body.position.x, body.position.z) > level.ringRadius + definitions[index].radius) uncredited.add(index);
      } else if (index > 0 && Math.hypot(body.position.x, body.position.z) > (level?.ringRadius ?? RING_RADIUS) + definitions[index].radius && !captured.has(index)) {
        if (level?.rule === 'bank' && !bankTargets.has(index)) uncredited.add(index);
        else captured.set(index, turn);
      }
      if (body.velocity.length() > 0.018) moving = true;
    });
    settledTime = moving ? 0 : settledTime + delta;
    if (settledTime > 0.28 || shotTime > 12) finishShot();
  }

  function opponentShot() {
    if (!level?.rival || turn !== 'rival' || active || roundOver) return null;
    const shooter = bodies[0].position;
    const available = bodies.map((body, index) => ({ body, index })).filter(({ index }) => index > 0 && !captured.has(index));
    available.sort((first, second) => {
      const firstDistance = Math.hypot(first.body.position.x - shooter.x, first.body.position.z - shooter.z);
      const secondDistance = Math.hypot(second.body.position.x - shooter.x, second.body.position.z - shooter.z);
      return firstDistance - secondDistance;
    });
    if (!available.length) return null;
    const target = available[rivalShots % Math.min(2, available.length)].body.position;
    const angle = Math.atan2(target.x - shooter.x, shooter.z - target.z) * 180 / Math.PI;
    const variation = Math.sin((rivalShots + 1) * 5.41 + level.id.length);
    return { angle: angle + variation * level.rival.error, power: Math.min(0.9, level.rival.power + variation * 0.09) };
  }

  function snapshot() {
    const score = scores();
    const goal = level?.target ?? definitions.length - 1;
    const won = level?.rule === 'duel' ? roundOver && score.player > score.rival : score.player >= goal;
    return {
      active, mode, shots, score: score.player, total: definitions.length - 1, roundOver, won,
      levelId: level?.id ?? null, rule: level?.rule ?? 'knockout', goal,
      shotLimit: level?.shots ?? (mode === 'challenge' ? 7 : null),
      rivalScore: score.rival, rivalShots, turn, banked, foul, lastShot,
      remaining: bodies.map((_, index) => index).filter((index) => index > 0 && !captured.has(index)),
    };
  }

  buildBoard();
  reset();
  return {
    get bodies() { return bodies; },
    step, shoot, reset, opponentShot,
    setLevel(next: Level | undefined) { level = next; buildBoard(); reset(); },
    isVisible: (index: number) => world.bodies.includes(bodies[index]),
    snapshot,
  };
}

export type Match = ReturnType<typeof createMatch>;