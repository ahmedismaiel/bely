import * as THREE from 'three';
import { createMatch } from './physics';
import type { Actor, MatchMode } from './physics';
import type { Street } from './scene';
import type { Level } from './levels';

export type GameState = ReturnType<ReturnType<typeof createMatch>['snapshot']> & { paused: boolean; preview: boolean; replaying: boolean; canReplay: boolean };
type ReplayFrame = { time: number; balls: { position: number[]; rotation: number[]; visible: boolean }[] };

export function createGame(stage: Street, callbacks: {
  onChange: (state: GameState) => void;
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
  let assists = true;
  let paused = false;
  let preview = false;
  let replaying = false;
  let level: Level | undefined;
  let rivalClock = 0;
  let recordingClock = 0;
  let recording: ReplayFrame[] = [];
  let lastReplay: ReplayFrame[] = [];
  let replayClock = 0;
  let replayFrame = 0;
  let equipped = { color: 0x087fbc, style: 0, finish: 0, secondary: 0xc8e5dd };
  let renderedActor: Actor | null = null;
  let replayActor: Actor = 'player';
  const savedCamera = { position: new THREE.Vector3(), target: new THREE.Vector3(), damping: true };
  let replayedShots = 0;

  function snapshot(): GameState {
    return { ...match.snapshot(), paused, preview, replaying, canReplay: lastReplay.length > 1 };
  }

  function recordFrame() {
    recording.push({
      time: recordingClock,
      balls: match.bodies.map((body, index) => ({ position: [body.position.x, body.position.y, body.position.z], rotation: [body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w], visible: match.isVisible(index) })),
    });
  }

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
    if (!replaying) {
      stage.marbles.meshes.forEach((mesh, index) => {
        const body = match.bodies[index];
        mesh.visible = !!body && match.isVisible(index);
        if (!body) return;
        mesh.position.set(body.position.x, body.position.y, body.position.z);
        mesh.quaternion.set(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w);
      });
      const actor = match.snapshot().turn;
      if (renderedActor !== actor) {
        renderedActor = actor;
        stage.marbles.setSkin(actor === 'rival' ? level?.rival?.color ?? equipped.color : equipped.color, actor === 'rival' ? 0 : equipped.style, actor === 'rival' ? 0 : equipped.finish, equipped.secondary);
      }
    }
    stage.marbles.sync();
    const state = snapshot();
    const signature = `${state.levelId}/${state.shots}/${state.rivalShots}/${state.score}/${state.rivalScore}/${state.turn}/${state.active}/${state.roundOver}/${state.mode}/${paused}/${preview}/${replaying}/${state.canReplay}/${state.lastShot?.serial}`;
    if (signature !== previousState) {
      previousState = signature;
      callbacks.onChange(state);
    }
    guide.visible = assists && !paused && !preview && !replaying && state.turn === 'player' && !state.active && !state.roundOver && (aiming || dragging || stage.getState().view === 'aim');
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
    if (paused || preview || replaying || match.snapshot().turn !== 'player') return false;
    unlockAudio();
    cancelDrag();
    stage.setTour(false);
    const fired = match.shoot(nextAngle, nextPower);
    if (fired) { lastReplay = []; recording = []; recordingClock = 0; replayActor = 'player'; recordFrame(); }
    aiming = false;
    sync();
    return fired;
  }

  function reset(mode?: MatchMode) {
    stopReplay();
    cancelDrag();
    match.reset(mode);
    lastReplay = [];
    recording = [];
    rivalClock = 0;
    renderedActor = null;
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
    if (event.button !== 0 || !event.isPrimary || paused || preview || replaying || match.snapshot().turn !== 'player' || match.snapshot().active || match.snapshot().roundOver) return;
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
    if (event.key.toLowerCase() === 'r' && !paused && !preview) reset();
    if (event.key === 'Escape') cancelDrag();
  });

  function stopReplay() {
    if (!replaying) return;
    replaying = false;
    stage.controls.update();
    stage.camera.position.copy(savedCamera.position);
    stage.controls.target.copy(savedCamera.target);
    stage.controls.enableDamping = savedCamera.damping;
    stage.controls.enabled = true;
    stage.controls.update();
    renderedActor = null;
  }

  function replay() {
    if (replaying) { stopReplay(); sync(); return false; }
    if (paused || preview || match.snapshot().active || lastReplay.length < 2) return false;
    cancelDrag();
    savedCamera.position.copy(stage.camera.position);
    savedCamera.target.copy(stage.controls.target);
    savedCamera.damping = stage.controls.enableDamping;
    stage.controls.enableDamping = false;
    stage.controls.update();
    stage.controls.enabled = false;
    stage.setTour(false);
    replaying = true;
    replayedShots++;
    replayClock = 0;
    replayFrame = 0;
    stage.marbles.setSkin(replayActor === 'rival' ? level?.rival?.color ?? equipped.color : equipped.color, replayActor === 'rival' ? 0 : equipped.style, replayActor === 'rival' ? 0 : equipped.finish, equipped.secondary);
    sync();
    return true;
  }

  function tick(delta: number) {
    if (document.hidden) return;
    if (replaying) {
      replayClock += delta * 0.72;
      while (replayFrame < lastReplay.length - 2 && lastReplay[replayFrame + 1].time < replayClock) replayFrame++;
      const first = lastReplay[replayFrame];
      const second = lastReplay[Math.min(replayFrame + 1, lastReplay.length - 1)];
      const blend = Math.min(1, Math.max(0, (replayClock - first.time) / Math.max(0.001, second.time - first.time)));
      let fastest = 0;
      let distance = 0;
      stage.marbles.meshes.forEach((mesh, index) => {
        const start = first.balls[index];
        const end = second.balls[index];
        mesh.visible = !!start?.visible;
        if (!start || !end) return;
        mesh.position.fromArray(start.position).lerp(new THREE.Vector3().fromArray(end.position), blend);
        mesh.quaternion.fromArray(start.rotation).slerp(new THREE.Quaternion().fromArray(end.rotation), blend);
        const movement = new THREE.Vector3().fromArray(start.position).distanceToSquared(new THREE.Vector3().fromArray(end.position));
        if (movement > distance) { fastest = index; distance = movement; }
      });
      const focus = stage.marbles.meshes[fastest].position;
      stage.camera.position.lerp(focus.clone().add(new THREE.Vector3(0.29, 0.19, 0.45)), Math.min(1, delta * 5));
      stage.controls.target.lerp(focus, Math.min(1, delta * 8));
      if (replayClock > lastReplay[lastReplay.length - 1].time + 0.3) stopReplay();
      sync();
      return;
    }
    if (paused || preview) { sync(); return; }
    const before = match.snapshot();
    match.step(delta);
    if (before.active) {
      recordingClock += delta;
      if (match.snapshot().active && (recording.length === 0 || recordingClock - recording[recording.length - 1].time >= 1 / 45)) recordFrame();
      if (!match.snapshot().active) { lastReplay = recording; recording = []; }
    }
    const state = match.snapshot();
    if (!state.active && !state.roundOver && state.turn === 'rival') {
      rivalClock += delta;
      if (rivalClock > 1.1) {
        const shot = match.opponentShot();
        if (shot && match.shoot(shot.angle, shot.power, 'rival')) {
          stage.setTour(false);
          lastReplay = [];
          recording = [];
          recordingClock = 0;
          replayActor = 'rival';
          recordFrame();
        }
        rivalClock = 0;
      }
    } else rivalClock = 0;
    sync();
  }

  sync();
  return {
    shoot, reset, setAim,
    snapshot, tick, replay,
    refresh() { previousState = ''; sync(); },
    replayCount: () => replayedShots,
    loadLevel(next: Level, asPreview = false) {
      stopReplay();
      cancelDrag();
      level = next;
      paused = false;
      preview = asPreview;
      lastReplay = [];
      recording = [];
      rivalClock = 0;
      renderedActor = null;
      match.setLevel(next);
      stage.setLevel(next);
      setAim(next.rule === 'bank' ? -51 : -6, next.rule === 'pocket' ? 0.4 : 0.58, false);
      sync();
    },
    setPaused(value: boolean) { if (value) { cancelDrag(); stopReplay(); } paused = value; sync(); },
    setSkin(color: number, style: number, finish = 0, secondary = 0xc8e5dd) { equipped = { color, style, finish, secondary }; renderedActor = null; sync(); },
    lineUp() {
      if (paused || preview || replaying || match.snapshot().active || match.snapshot().turn !== 'player') return;
      const index = match.snapshot().remaining[0];
      if (index === undefined) return;
      const target = match.bodies[index].position;
      const home = match.bodies[0].position;
      let heading = Math.atan2(target.x - home.x, home.z - target.z) * 180 / Math.PI;
      if (level?.rule === 'bank') {
        const rail = level.barriers.find((barrier) => barrier.bank && barrier.x < 0);
        if (rail) {
          const reflectionLine = rail.x + rail.width / 2 + level.layout[0].radius;
          const reflectedDistance = home.x - reflectionLine + (target.x - reflectionLine) / 0.78;
          heading = Math.atan2(-reflectedDistance, home.z - target.z) * 180 / Math.PI;
        }
      }
      setAim(heading, level?.rule === 'pocket' ? 0.4 : level?.rule === 'bank' ? 0.72 : 0.58);
      stage.setView('aim');
    },
    setSound(enabled: boolean) { soundEnabled = enabled; if (enabled) unlockAudio(); },
    setGuide(enabled: boolean) { assists = enabled; },
  };
}

export type Game = ReturnType<typeof createGame>;