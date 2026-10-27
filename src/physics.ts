import * as CANNON from 'cannon-es';
import { marbleLayout, RING_RADIUS } from './glass.ts';

export type MatchMode = 'practice' | 'challenge';

export function createMatch(onImpact: (speed: number) => void = () => {}) {
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.81, 0), allowSleep: true });
  world.broadphase = new CANNON.SAPBroadphase(world);
  (world.solver as CANNON.GSSolver).iterations = 16;
  (world.solver as CANNON.GSSolver).tolerance = 0.000001;
  const glass = new CANNON.Material('glass');
  const soil = new CANNON.Material('packed soil');
  world.addContactMaterial(new CANNON.ContactMaterial(glass, glass, {
    friction: 0.025, restitution: 0.78, contactEquationStiffness: 1e8, contactEquationRelaxation: 3,
  }));
  world.addContactMaterial(new CANNON.ContactMaterial(glass, soil, {
    friction: 0.24, restitution: 0.16, contactEquationStiffness: 1e8, contactEquationRelaxation: 3,
  }));
  const floor = new CANNON.Body({ mass: 0, material: soil, shape: new CANNON.Plane() });
  floor.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  world.addBody(floor);
  const bodies = marbleLayout.map((definition) => {
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
    body.addEventListener('collide', (event: { body: CANNON.Body; contact: CANNON.ContactEquation }) => {
      if (event.body.material === glass && body.id < event.body.id) {
        const speed = Math.abs(event.contact.getImpactVelocityAlongNormal());
        if (speed > 0.05) onImpact(speed);
      }
    });
    world.addBody(body);
    return body;
  });
  const captured = new Set<number>();
  let active = false;
  let mode: MatchMode = 'practice';
  let shots = 0;
  let settledTime = 0;
  let roundOver = false;

  world.addEventListener('preStep', () => {
    for (let index = 0; index < bodies.length; index++) {
      const body = bodies[index];
      if (body.sleepState === CANNON.Body.SLEEPING || body.position.y > marbleLayout[index].radius + 0.006) continue;
      const speed = Math.hypot(body.velocity.x, body.velocity.z);
      if (speed > 0.008) {
        const rollingResistance = body.mass * 0.38;
        body.force.x -= body.velocity.x / speed * rollingResistance;
        body.force.z -= body.velocity.z / speed * rollingResistance;
      } else if (Math.abs(body.velocity.y) < 0.035) {
        body.velocity.setZero();
        body.angularVelocity.setZero();
        body.sleep();
      }
    }
  });

  function reset(nextMode = mode) {
    mode = nextMode;
    captured.clear();
    shots = 0;
    active = false;
    roundOver = false;
    settledTime = 0;
    world.accumulator = 0;
    bodies.forEach((body, index) => {
      if (!world.bodies.includes(body)) world.addBody(body);
      const definition = marbleLayout[index];
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
    });
  }

  function shoot(angle: number, power: number) {
    if (active || roundOver || !Number.isFinite(angle) || !Number.isFinite(power)) return false;
    const strength = Math.max(0.05, Math.min(1, power));
    const speed = 0.75 + strength * 3.25;
    const heading = angle * Math.PI / 180;
    const shooter = bodies[0];
    bodies.forEach((body, index) => { if (!captured.has(index)) body.wakeUp(); });
    shooter.velocity.set(Math.sin(heading) * speed, 0.015, -Math.cos(heading) * speed);
    shooter.angularVelocity.set(shooter.velocity.z / marbleLayout[0].radius * 0.25, 0, -shooter.velocity.x / marbleLayout[0].radius * 0.25);
    shots++;
    settledTime = 0;
    active = true;
    return true;
  }

  function finishShot() {
    for (const index of captured) {
      if (world.bodies.includes(bodies[index])) world.removeBody(bodies[index]);
    }
    const shooter = bodies[0];
    const home = marbleLayout[0].position;
    shooter.position.set(home[0], home[1], home[2]);
    shooter.previousPosition.copy(shooter.position);
    shooter.interpolatedPosition.copy(shooter.position);
    shooter.velocity.setZero();
    shooter.angularVelocity.setZero();
    shooter.aabbNeedsUpdate = true;
    shooter.sleep();
    active = false;
    roundOver = captured.size === marbleLayout.length - 1 || (mode === 'challenge' && shots >= 7);
  }

  function step(elapsed: number) {
    if (!active) return;
    const delta = Math.max(0, Math.min(elapsed, 1 / 15));
    world.step(1 / 240, delta, 16);
    let moving = false;
    bodies.forEach((body, index) => {
      if (!world.bodies.includes(body)) return;
      if (index > 0 && Math.hypot(body.position.x, body.position.z) > RING_RADIUS + marbleLayout[index].radius) captured.add(index);
      if (body.velocity.length() > 0.018) moving = true;
    });
    settledTime = moving ? 0 : settledTime + delta;
    if (settledTime > 0.28) finishShot();
  }

  reset();
  return {
    bodies, step, shoot, reset,
    isVisible: (index: number) => world.bodies.includes(bodies[index]),
    snapshot: () => ({ active, mode, shots, score: captured.size, total: marbleLayout.length - 1, roundOver, won: captured.size === marbleLayout.length - 1 }),
  };
}

export type Match = ReturnType<typeof createMatch>;