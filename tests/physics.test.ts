import test from 'node:test';
import assert from 'node:assert/strict';
import { createMatch } from '../src/physics.ts';
import { marbleLayout } from '../src/glass.ts';

function settle(match: ReturnType<typeof createMatch>) {
  let frames = 0;
  while (match.snapshot().active && frames < 1200) {
    match.step(1 / 60);
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