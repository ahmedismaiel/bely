import * as THREE from 'three';
import { createMatch } from './physics';
import type { MatchMode } from './physics';
import type { Street } from './scene';

type MatchState = ReturnType<ReturnType<typeof createMatch>['snapshot']>;

export function createGame(stage: Street, callbacks: {
  onChange: (state: MatchState) => void;
  onAim: (angle: number, power: number) => void;
}) {
  let audio: AudioContext | undefined;
  let soundEnabled = true;
  let lastImpact = 0;
  function unlockAudio() {
    if (!soundEnabled) return;
    audio ??= new AudioContext();
    if (audio.state === 'suspended') void audio.resume();
  }
  function impact(speed: number) {
    if (!soundEnabled || !audio || audio.state !== 'running') return;
    const now = audio.currentTime;
    if (now - lastImpact < 0.016) return;
    lastImpact = now;
    for (const frequency of [2860, 4310, 6470]) {
      const oscillator = audio.createOscillator();
      const envelope = audio.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency + speed * 35, now);
      envelope.gain.setValueAtTime(0.0001, now);
      envelope.gain.exponentialRampToValueAtTime(Math.min(0.095, 0.018 + speed * 0.024) * (2860 / frequency), now + 0.001);
      envelope.gain.exponentialRampToValueAtTime(0.0001, now + 0.065);
      oscillator.connect(envelope);
      envelope.connect(audio.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.075);
      oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
    }
  }
  const match = createMatch(impact);
  let angle = -6;
  let power = 0.58;
  let dragging = false;
  let dragPointer = -1;
  let pullDistance = 0;
  const dragOrigin = new THREE.Vector3();
  let previousState = '';
  let aiming = false;

  const accent = getComputedStyle(document.documentElement).getPropertyValue('--cp-accent').trim();
  const guide = new THREE.Group();
  guide.name = 'Shot guide';
  const guideGeometry = new THREE.BufferGeometry();
  guideGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
  const guideLine = new THREE.Line(guideGeometry, new THREE.LineDashedMaterial({ color: accent, dashSize: 0.013, gapSize: 0.009, transparent: true, opacity: 0.72, depthWrite: false }));
  guide.add(guideLine);
  const marker = new THREE.Mesh(new THREE.RingGeometry(0.043, 0.0444, 64), new THREE.MeshBasicMaterial({ color: accent, side: THREE.DoubleSide, transparent: true, opacity: 0.7, depthWrite: false }));
  marker.rotation.x = -Math.PI / 2;
  guide.add(marker);
  guide.traverse((object) => object.layers.set(1));
  stage.camera.layers.enable(1);
  stage.scene.add(guide);

  function sync() {
    match.bodies.forEach((body, index) => {
      const mesh = stage.marbles.meshes[index];
      mesh.visible = match.isVisible(index);
      mesh.position.set(body.position.x, body.position.y, body.position.z);
      mesh.quaternion.set(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w);
    });
    stage.marbles.sync();
    const state = match.snapshot();
    const signature = `${state.shots}/${state.score}/${state.active}/${state.roundOver}/${state.mode}`;
    if (signature !== previousState) {
      previousState = signature;
      callbacks.onChange(state);
    }
    guide.visible = !state.active && !state.roundOver && (aiming || dragging || stage.getState().view === 'aim');
    if (guide.visible) {
      const shooter = match.bodies[0].position;
      const heading = angle * Math.PI / 180;
      const length = 0.17 + power * 0.35;
      const positions = guideGeometry.attributes.position;
      positions.setXYZ(0, shooter.x, 0.005, shooter.z);
      positions.setXYZ(1, shooter.x + Math.sin(heading) * length, 0.005, shooter.z - Math.cos(heading) * length);
      positions.needsUpdate = true;
      guideLine.computeLineDistances();
      marker.position.set(shooter.x, 0.004, shooter.z);
    }
  }

  function setAim(nextAngle: number, nextPower: number, reveal = true) {
    if (Number.isFinite(nextAngle)) angle = Math.max(-180, Math.min(180, nextAngle));
    if (Number.isFinite(nextPower)) power = Math.max(0.05, Math.min(1, nextPower));
    aiming = reveal;
    callbacks.onAim(angle, power);
    sync();
  }

  function cancelDrag() {
    dragging = false;
    if (dragPointer >= 0 && stage.renderer.domElement.hasPointerCapture(dragPointer)) stage.renderer.domElement.releasePointerCapture(dragPointer);
    dragPointer = -1;
    stage.controls.enabled = true;
  }

  function shoot(nextAngle = angle, nextPower = power) {
    unlockAudio();
    cancelDrag();
    stage.setTour(false);
    const fired = match.shoot(nextAngle, nextPower);
    aiming = false;
    sync();
    return fired;
  }

  function reset(mode?: MatchMode) {
    cancelDrag();
    match.reset(mode);
    aiming = false;
    setAim(-6, 0.58, false);
    sync();
  }

  const raycaster = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  function groundPoint(event: PointerEvent) {
    const rect = stage.renderer.domElement.getBoundingClientRect();
    const pointer = new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, stage.camera);
    return raycaster.ray.intersectPlane(plane, new THREE.Vector3());
  }
  const canvas = stage.renderer.domElement;
  canvas.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || !event.isPrimary || match.snapshot().active || match.snapshot().roundOver) return;
    const point = groundPoint(event);
    const shooter = match.bodies[0].position;
    const projected = stage.marbles.meshes[0].position.clone().project(stage.camera);
    const rect = canvas.getBoundingClientRect();
    const screenDistance = Math.hypot(event.clientX - (rect.left + (projected.x + 1) * 0.5 * rect.width), event.clientY - (rect.top + (1 - projected.y) * 0.5 * rect.height));
    if (!point || (Math.hypot(point.x - shooter.x, point.z - shooter.z) > 0.07 && screenDistance > 32)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    unlockAudio();
    stage.setTour(false);
    stage.controls.enabled = false;
    dragging = true;
    aiming = true;
    dragPointer = event.pointerId;
    pullDistance = 0;
    dragOrigin.copy(point);
    canvas.setPointerCapture(event.pointerId);
    sync();
  }, { capture: true });
  canvas.addEventListener('pointermove', (event) => {
    if (!dragging || event.pointerId !== dragPointer) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const point = groundPoint(event);
    if (!point) return;
    const horizontal = dragOrigin.x - point.x;
    const depth = dragOrigin.z - point.z;
    pullDistance = Math.hypot(horizontal, depth);
    setAim(Math.atan2(horizontal, -depth) * 180 / Math.PI, pullDistance / 0.32);
  }, { capture: true });
  canvas.addEventListener('pointerup', (event) => {
    if (!dragging || event.pointerId !== dragPointer) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (pullDistance > 0.016) shoot();
    else cancelDrag();
  }, { capture: true });
  canvas.addEventListener('pointercancel', cancelDrag);
  canvas.addEventListener('lostpointercapture', () => { if (dragging) cancelDrag(); });
  addEventListener('keydown', (event) => {
    if (event.target instanceof Element && event.target.closest('input, select, textarea, button, a')) return;
    if (event.code === 'Space') { event.preventDefault(); shoot(); }
    if (event.key.toLowerCase() === 'r') reset();
    if (event.key === 'Escape') cancelDrag();
  });
  sync();
  return {
    shoot, reset, setAim,
    snapshot: match.snapshot,
    tick(delta: number) { if (!document.hidden) match.step(delta); sync(); },
    setSound(enabled: boolean) { soundEnabled = enabled; if (enabled) unlockAudio(); },
    setGuide(enabled: boolean) { aiming = enabled; },
  };
}