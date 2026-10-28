import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { EXPERIMENTS, EXPERIMENT_MODES, experimentHeight, routePosition } from './experiments';
import type { ExperimentMode } from './experiments';
import { LEVELS } from './levels';
import { bilingual as text, isArabic } from './locale';
import type { Street } from './scene';
import type { Game } from './game';
import { siteUrl } from './urls';

type SavedReview = { verdict: 'keep' | 'change' | 'reject' | null; note: string };
type RecordBook = { results: Record<string, { seconds: number; resets: number }>; reviews: Record<string, SavedReview> };

export function createPlayground(stage: Street, game: Game, refreshIcons: () => void, resumeStory: () => void) {
  const saved: RecordBook = { results: {}, reviews: {} };
  try {
    const data = JSON.parse(localStorage.getItem('bely-experiments-v1') ?? 'null');
    if (data?.results && data?.reviews) { saved.results = data.results; saved.reviews = data.reviews; }
  } catch { saved.results = {}; }
  let active = false;
  let paused = false;
  let experiment = EXPERIMENTS[0];
  let selectedMode: ExperimentMode = 'trail';
  let selectedDifficulty = 0;
  let selectedSearch = '';
  let world = new CANNON.World();
  let player = new CANNON.Body();
  let targets: CANNON.Body[] = [];
  let group = new THREE.Group();
  let elapsed = 0;
  let gates = 0;
  let resets = 0;
  let finished = false;
  let won = false;
  let pulseCharges = 3;
  let jumpCooldown = 0;
  let glideRemaining = 4;
  let gliding = false;
  let pulseTime = 1;
  let pulseMesh: THREE.Mesh;
  let heightTexture: THREE.DataTexture | undefined;
  let startingSnapshot: ReturnType<Game['snapshot']> | undefined;
  let latestCheckpoint = new THREE.Vector3(0, 0.14, 1.2);
  const gateMeshes: THREE.Mesh[] = [];
  const movingBarriers: { body: CANNON.Body; mesh: THREE.Mesh; origin: number; phase: number }[] = [];
  const inputs = new Set<string>();
  const collectibles = new Set<number>();
  const cameraTarget = new THREE.Vector3();
  const cameraPosition = new THREE.Vector3();
  const terrainMaterial = (stage.scene.getObjectByName('Poly Haven scanned soil') as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>).material;
  const wood = new THREE.MeshStandardMaterial({ color: 0x776c59, roughness: 0.83 });
  const bronze = new THREE.MeshStandardMaterial({ color: 0xb9944b, metalness: 0.72, roughness: 0.27 });
  const checkpointMaterial = new THREE.MeshStandardMaterial({ color: 0xc9ad68, emissive: 0x735c25, emissiveIntensity: 0.23, metalness: 0.72, roughness: 0.25 });

  const menu = document.createElement('dialog');
  menu.id = 'experiments-dialog';
  menu.className = 'experiments-dialog';
  menu.innerHTML = `<header class="experiment-header"><div><p class="eyebrow">BELY / ${text('PLAY LAB', 'مختبر اللعب')}</p><h2 id="lab-title"></h2></div><button class="icon-button" id="close-lab" aria-label="${text('Close modes', 'إغلاق الأنماط')}"><i data-lucide="x"></i></button></header><div class="lab-toolbar"><nav id="mode-tabs"></nav><div class="lab-filters"><select id="difficulty-filter" aria-label="${text('Difficulty', 'الصعوبة')}"><option value="0">${text('All difficulties', 'كل الصعوبات')}</option>${[1, 2, 3, 4, 5].map((difficulty) => `<option value="${difficulty}">${text('Tier', 'المستوى')} ${difficulty}</option>`).join('')}</select><input type="search" id="idea-search" placeholder="${text('Find a scenario', 'ابحث عن تجربة')}" aria-label="${text('Find a scenario', 'ابحث عن تجربة')}"></div></div><p class="lab-summary" id="lab-summary"></p><section class="idea-grid" id="idea-grid"></section>`;
  document.body.append(menu);
  const hud = document.createElement('div');
  hud.id = 'playground-hud';
  hud.className = 'playground-hud';
  hud.hidden = true;
  hud.innerHTML = `<header class="playground-top"><div class="playground-heading"><p class="eyebrow" id="run-mode"></p><h2 id="run-name"></h2><p id="run-goal"></p></div><div class="playground-top-actions"><button class="icon-button" id="run-restart" aria-label="${text('Restart course', 'إعادة المسار')}"><i data-lucide="rotate-ccw"></i></button><button class="icon-button" id="run-menu" aria-label="${text('Scenarios', 'التجارب')}"><i data-lucide="layout-grid"></i></button><button class="icon-button" id="leave-lab" aria-label="${text('Return to story', 'العودة للحكاية')}"><i data-lucide="log-out"></i></button></div></header><div class="run-readout"><span id="run-time"></span><span id="run-progress"></span><span id="run-checkpoint"></span></div><div class="movement-pad" aria-label="${text('Movement', 'الحركة')}"><button data-move="forward" aria-label="${text('Forward', 'للأمام')}"><i data-lucide="arrow-up"></i></button><button data-move="left" aria-label="${text('Left', 'لليسار')}"><i data-lucide="arrow-left"></i></button><button data-move="backward" aria-label="${text('Backward', 'للخلف')}"><i data-lucide="arrow-down"></i></button><button data-move="right" aria-label="${text('Right', 'لليمين')}"><i data-lucide="arrow-right"></i></button></div><div class="power-controls"><button id="power-jump"><i data-lucide="arrow-up-from-line"></i><span>${text('Jump', 'اقفز')}</span></button><button id="power-glide"><i data-lucide="wind"></i><span>${text('Glide', 'حلّق')}</span><small id="glide-charge">4.0</small></button><button id="power-pulse"><i data-lucide="zap"></i><span>${text('Pulse', 'نبضة')}</span><small id="pulse-charge">3</small></button></div><section class="run-result" id="run-result" hidden><p class="eyebrow" id="run-result-kicker"></p><h2 id="run-result-title"></h2><p id="run-result-detail"></p><div class="run-result-actions"><button class="primary-action" id="run-next">${text('Next course', 'المسار التالي')}</button><button id="run-again">${text('Try again', 'حاول ثانية')}</button></div><fieldset class="mode-verdict"><legend>${text('Your verdict', 'رأيك في التجربة')}</legend><label><input type="radio" name="run-verdict" value="keep">${text('Keep', 'احتفظ بها')}</label><label><input type="radio" name="run-verdict" value="change">${text('Change', 'تحتاج تعديل')}</label><label><input type="radio" name="run-verdict" value="reject">${text('Reject', 'ارفضها')}</label></fieldset><textarea id="run-note" rows="2" placeholder="${text('What would make this better?', 'إيه اللي يخليها أحسن؟')}"></textarea></section>`;
  document.body.append(hud);
  const feedbackButton = document.createElement('button');
  feedbackButton.className = 'icon-button';
  feedbackButton.id = 'rate-experiment';
  feedbackButton.setAttribute('aria-label', text('Review this experiment', 'قيّم التجربة'));
  feedbackButton.innerHTML = '<i data-lucide="message-square"></i>';
  hud.querySelector('.playground-top-actions')!.prepend(feedbackButton);
  feedbackButton.addEventListener('click', () => {
    paused = true;
    inputs.clear();
    hud.querySelector<HTMLElement>('#run-result')!.hidden = false;
    hud.querySelector('#run-result-kicker')!.textContent = isArabic() ? experiment.nameAr : experiment.name;
    hud.querySelector('#run-result-title')!.textContent = text('Your take', 'رأيك إيه؟');
    hud.querySelector('#run-result-detail')!.textContent = text('Keep it, change it, or take it in another direction.', 'نحتفظ بيها، نعدلها، ولا نجرب اتجاه تاني؟');
    hud.querySelector('#run-again')!.textContent = text('Resume', 'كمل');
  });

  function persist() {
    try { localStorage.setItem('bely-experiments-v1', JSON.stringify(saved)); } catch { document.body.dataset.experimentStorage = 'unavailable'; }
  }

  function renderMenu() {
    const mode = EXPERIMENT_MODES.find((item) => item.id === selectedMode)!;
    menu.querySelector('#lab-title')!.textContent = text('Six modes. 240 experiments.', 'ستة أنماط. ٢٤٠ تجربة.');
    menu.querySelector('#mode-tabs')!.innerHTML = EXPERIMENT_MODES.map((item) => `<button data-mode="${item.id}" aria-pressed="${item.id === selectedMode}"><i data-lucide="${item.icon}"></i><span>${isArabic() ? item.ar : item.name}</span></button>`).join('');
    menu.querySelector('#lab-summary')!.textContent = `${isArabic() ? mode.pitchAr : mode.pitch} ${text('Seeded prototype courses, not hand-authored story chapters.', 'مسارات تجريبية مولدة، وليست فصول حكاية مؤلفة يدويًا.')}`;
    const shown = EXPERIMENTS.filter((item) => item.mode === selectedMode && (!selectedDifficulty || item.difficulty === selectedDifficulty) && `${item.name} ${item.nameAr} ${item.pitch}`.toLowerCase().includes(selectedSearch.toLowerCase()));
    menu.querySelector('#idea-grid')!.innerHTML = shown.map((item) => `<article class="idea-card"><img loading="lazy" src="${siteUrl(`devlog/05-mode-${item.mode}.webp`)}" width="640" height="360" alt="${isArabic() ? mode.ar : mode.name}"><div class="idea-details"><p class="eyebrow">${text('TIER', 'مستوى')} ${item.difficulty} / ${text('GENERATED COURSE', 'مسار مولد')}</p><h3>${isArabic() ? item.nameAr : item.name}</h3><p>${isArabic() ? item.pitchAr : item.pitch}</p><div class="idea-bottom"><button class="primary-action" data-experiment="${item.id}"><i data-lucide="play"></i>${text('Play', 'العب')}</button><span>${reviewLabel(item.id)}</span></div></div></article>`).join('');
    refreshIcons();
  }

  function reviewLabel(id: string) {
    const result = saved.results[id];
    if (result) return `${result.seconds.toFixed(1)}s`;
    const verdict = saved.reviews[id]?.verdict;
    return verdict ? text(verdict, { keep: 'مقبولة', change: 'تحتاج تعديل', reject: 'مرفوضة' }[verdict]) : '';
  }

  function open() {
    window.dispatchEvent(new CustomEvent('bely-modal-open'));
    paused = true;
    inputs.clear();
    game.setPaused(true);
    if (!menu.open) menu.showModal();
    renderMenu();
  }
  function closeMenu() { menu.close(); paused = false; if (!active) game.setPaused(false); }

  function clearCourse() {
    stage.scene.remove(group);
    group.traverse((object) => { if (object instanceof THREE.Mesh) object.geometry.dispose(); });
    heightTexture?.dispose();
    movingBarriers.length = 0;
    gateMeshes.length = 0;
  }

  function height(horizontal: number, depth: number) { return experiment.mode === 'pulse' ? 0.024 : experimentHeight(experiment, horizontal, depth); }

  function courseGeometry() {
    const step = 0.125;
    const columns = 41;
    const rows = 97;
    const data: number[][] = [];
    const heightData = new Float32Array(columns * rows);
    const positions: number[] = [];
    const coordinates: number[] = [];
    const indices: number[] = [];
    for (let column = 0; column < columns; column++) {
      data[column] = [];
      for (let row = 0; row < rows; row++) {
        const horizontal = -2.5 + column * step;
        const depth = 2 - row * step;
        const altitude = height(horizontal, depth);
        data[column][row] = altitude;
        heightData[row * columns + column] = altitude;
        positions.push(horizontal, altitude, depth);
        coordinates.push((horizontal + 12) / 24, (12 - depth) / 24);
        if (column < columns - 1 && row < rows - 1) {
          const first = column * rows + row;
          indices.push(first, first + rows, first + 1, first + rows, first + rows + 1, first + 1);
        }
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(coordinates, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const ground = new THREE.Mesh(geometry, terrainMaterial);
    ground.receiveShadow = true;
    group.add(ground);
    const heightfield = new CANNON.Body({ mass: 0, shape: new CANNON.Heightfield(data, { elementSize: step }) });
    heightfield.position.set(-2.5, 0, 2);
    heightfield.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(heightfield);
    heightTexture = new THREE.DataTexture(heightData, columns, rows, THREE.RedFormat, THREE.FloatType);
    heightTexture.minFilter = heightTexture.magFilter = THREE.LinearFilter;
    heightTexture.needsUpdate = true;
    stage.marbles.uniforms.uTerrainMap.value = heightTexture;
    stage.marbles.uniforms.uTerrainEnabled.value = 1;
    stage.marbles.uniforms.uTerrainBounds.value.set(-2.5, 2, 5, 12);
  }

  function obstacle(horizontal: number, depth: number, width: number, moving: boolean, index: number) {
    const heightAt = height(horizontal, depth);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, 0.12, 0.12), wood);
    mesh.position.set(horizontal, heightAt + 0.06, depth);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    const body = new CANNON.Body({ mass: 0, type: moving ? CANNON.Body.KINEMATIC : CANNON.Body.STATIC, shape: new CANNON.Box(new CANNON.Vec3(width / 2, 0.06, 0.06)) });
    body.position.set(mesh.position.x, mesh.position.y, mesh.position.z);
    world.addBody(body);
    if (moving) movingBarriers.push({ body, mesh, origin: horizontal, phase: index * 1.6 });
  }

  function launch(id: string) {
    const selected = EXPERIMENTS.find((item) => item.id === id);
    if (!selected) return false;
    window.dispatchEvent(new CustomEvent('bely-modal-open'));
    if (!active) startingSnapshot = game.snapshot();
    menu.close();
    inputs.clear();
    clearCourse();
    experiment = selected;
    selectedMode = selected.mode;
    active = true;
    paused = false;
    elapsed = 0;
    gates = 0;
    resets = 0;
    finished = false;
    won = false;
    pulseCharges = selected.mode === 'pulse' ? 4 : 2;
    jumpCooldown = 0;
    glideRemaining = selected.mode === 'sky' ? 7 : 3;
    gliding = false;
    collectibles.clear();
    game.setPaused(true);
    stage.setLevel(LEVELS.find((level) => level.arena === selected.arena)!);
    stage.controls.enabled = false;
    stage.controls.enableDamping = false;
    stage.setTour(false);
    stage.setDepthOfField(false);
    stage.camera.fov = 54;
    stage.camera.updateProjectionMatrix();
    document.body.classList.add('experimental-play');
    document.body.classList.remove('hidden-hud');
    hud.hidden = false;
    for (const [kind, english, arabic] of [['jump', 'Jump', 'اقفز'], ['glide', 'Glide', 'حلّق'], ['pulse', 'Pulse', 'نبضة']]) hud.querySelector(`#power-${kind} span`)!.textContent = text(english, arabic);
    hud.querySelector('#run-next')!.textContent = text('Next course', 'المسار التالي');
    hud.querySelector('#run-again')!.textContent = text('Try again', 'حاول ثانية');
    const mode = EXPERIMENT_MODES.find((item) => item.id === selected.mode)!;
    hud.querySelector('#run-mode')!.textContent = `${isArabic() ? mode.ar : mode.name} / ${text('Tier', 'مستوى')} ${selected.difficulty}`;
    hud.querySelector('#run-name')!.textContent = isArabic() ? selected.nameAr : selected.name;
    hud.querySelector('#run-goal')!.textContent = selected.mode === 'pulse' ? text('Push every target beyond the circle.', 'أخرج كل الأهداف من الدائرة.') : selected.mode === 'courier' ? text('Collect four marbles and reach the final ring.', 'اجمع أربع بليات ووصل للحلقة الأخيرة.') : text('Reach all four checkpoints.', 'اعبر نقاط الحفظ الأربع.');
    hud.querySelector<HTMLElement>('#run-result')!.hidden = true;
    hud.querySelector<HTMLInputElement>('#run-note')!.value = saved.reviews[id]?.note ?? '';
    hud.querySelectorAll<HTMLInputElement>('[name="run-verdict"]').forEach((input) => { input.checked = saved.reviews[id]?.verdict === input.value; });
    world = new CANNON.World({ gravity: new CANNON.Vec3(0, selected.mode === 'gravity' ? -3.1 : -9.81, 0), allowSleep: false });
    world.broadphase = new CANNON.NaiveBroadphase();
    (world.solver as CANNON.GSSolver).iterations = 14;
    world.defaultContactMaterial.friction = selected.mode === 'gravity' ? 0.05 : 0.32;
    world.defaultContactMaterial.restitution = 0.12;
    group = new THREE.Group();
    group.name = `Experimental course / ${selected.id}`;
    stage.scene.add(group);
    courseGeometry();
    const radius = 0.085;
    player = new CANNON.Body({ mass: 0.2, shape: new CANNON.Sphere(radius), linearDamping: 0.18, angularDamping: 0.25 });
    latestCheckpoint.set(0, height(0, 1.2) + radius + 0.007, 1.2);
    player.position.set(latestCheckpoint.x, latestCheckpoint.y, latestCheckpoint.z);
    world.addBody(player);
    targets = [];
    const definitions = [{ position: [0, player.position.y, 1.2] as [number, number, number], radius, color: 0x168bc2 }];
    if (selected.mode === 'pulse') {
      const count = 5 + selected.difficulty;
      for (let index = 0; index < count; index++) {
        const angle = index / count * Math.PI * 2;
        const target = new CANNON.Body({ mass: 0.11, shape: new CANNON.Sphere(0.068), linearDamping: 0.38, angularDamping: 0.3 });
        target.position.set(Math.sin(angle) * 0.51, 0.094, Math.cos(angle) * 0.51);
        world.addBody(target);
        targets.push(target);
        definitions.push({ position: [target.position.x, target.position.y, target.position.z], radius: 0.068, color: [0xe47844, 0x58a478, 0xa38cce, 0xdbbd61][index % 4] });
      }
      stage.marbles.uniforms.uRingRadius.value = 1.2;
    } else {
      stage.marbles.uniforms.uRingRadius.value = 1000;
      for (let index = 0; index < 4; index++) {
        const point = routePosition(selected, index);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.027, 10, 40), checkpointMaterial.clone());
        ring.position.set(point.x, point.y + (selected.mode === 'sky' && index % 2 ? 0.55 : 0.30), point.z);
        ring.castShadow = true;
        group.add(ring);
        gateMeshes.push(ring);
        if (selected.mode === 'courier') {
          const orb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 24, 16), bronze);
          orb.position.set(point.x, point.y + 0.12, point.z + 0.30);
          orb.name = `pickup-${index}`;
          group.add(orb);
        }
      }
      for (let index = 0; index < selected.difficulty + 1; index++) {
        const depth = -1.9 - index * 1.45;
        const horizontal = Math.sin(selected.seed * 0.7 + index * 2) * 1.0;
        obstacle(horizontal, depth, 0.45 + selected.difficulty * 0.055, selected.difficulty > 2 && index % 2 === 0, index);
      }
    }
    stage.marbles.setLayout(definitions);
    stage.marbles.uniforms.uZoneCount.value = 0;
    stage.marbles.uniforms.uPocketCount.value = 0;
    pulseMesh = new THREE.Mesh(new THREE.RingGeometry(0.87, 1.0, 64), new THREE.MeshBasicMaterial({ color: 0xe6cf7a, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false }));
    pulseMesh.rotation.x = -Math.PI / 2;
    pulseMesh.visible = false;
    group.add(pulseMesh);
    stage.camera.position.set(0.2, 0.85, 2.7);
    stage.controls.target.set(0, 0.18, 0.6);
    stage.controls.update();
    refreshIcons();
    return true;
  }

  function onGround() { return player.position.y <= height(player.position.x, player.position.z) + 0.125; }
  function power(kind: 'jump' | 'glide' | 'pulse') {
    if (!active || paused || finished) return false;
    if (kind === 'jump') {
      if (!onGround() || jumpCooldown > 0) return false;
      player.velocity.y = experiment.mode === 'gravity' ? 2.3 : 3.7;
      jumpCooldown = 0.5;
      return true;
    }
    if (kind === 'glide') { gliding = !gliding && glideRemaining > 0; return gliding; }
    if (pulseCharges <= 0) return false;
    pulseCharges--;
    pulseTime = 0;
    pulseMesh.position.set(player.position.x, height(player.position.x, player.position.z) + 0.015, player.position.z);
    for (const target of targets) {
      const displacement = target.position.vsub(player.position);
      const distance = displacement.length();
      if (distance > 1.45 || distance < 0.001) continue;
      displacement.normalize();
      displacement.y = 0.12;
      target.applyImpulse(displacement.scale(target.mass * (5.7 - distance * 3.1)));
    }
    player.velocity.y = Math.max(player.velocity.y, 1.2);
    return true;
  }

  function complete(success: boolean) {
    finished = true;
    won = success;
    inputs.clear();
    const best = saved.results[experiment.id];
    if (success && (!best || elapsed < best.seconds)) { saved.results[experiment.id] = { seconds: elapsed, resets }; persist(); }
    hud.querySelector<HTMLElement>('#run-result')!.hidden = false;
    hud.querySelector('#run-result-kicker')!.textContent = isArabic() ? experiment.nameAr : experiment.name;
    hud.querySelector('#run-result-title')!.textContent = success ? text('Course cleared', 'اجتزت المسار') : text('Time is up', 'انتهى الوقت');
    hud.querySelector('#run-result-detail')!.textContent = `${elapsed.toFixed(1)}s / ${resets} ${text('resets', 'إعادات')}`;
  }

  function tick(delta: number) {
    if (!active) return;
    stage.marbles.meshes.forEach((mesh, index) => { mesh.visible = index === 0 || index <= targets.length && !collectibles.has(index - 1); });
    if (!paused && !finished) {
      elapsed += delta;
      jumpCooldown = Math.max(0, jumpCooldown - delta);
      const horizontal = Number(inputs.has('right')) - Number(inputs.has('left'));
      const depth = Number(inputs.has('backward')) - Number(inputs.has('forward'));
      const magnitude = Math.hypot(horizontal, depth) || 1;
      const force = (experiment.mode === 'gravity' ? 1.2 : 1.6) * player.mass;
      player.force.x += horizontal / magnitude * force;
      player.force.z += depth / magnitude * force;
      if (!horizontal && !depth && onGround()) { player.velocity.x *= Math.pow(0.09, delta); player.velocity.z *= Math.pow(0.09, delta); }
      const speed = Math.hypot(player.velocity.x, player.velocity.z);
      if (speed > 2.45) { player.velocity.x *= 2.45 / speed; player.velocity.z *= 2.45 / speed; }
      if (gliding && glideRemaining > 0 && !onGround()) {
        player.force.y += player.mass * (experiment.mode === 'gravity' ? 2.4 : 8.8);
        player.velocity.y = Math.max(player.velocity.y, -0.35);
        glideRemaining = Math.max(0, glideRemaining - delta);
      }
      if (experiment.difficulty > 3) player.force.x += Math.sin(elapsed * 0.8 + experiment.seed) * 0.08;
      for (const barrier of movingBarriers) {
        const desired = barrier.origin + Math.sin(elapsed * 0.9 + barrier.phase) * 0.35;
        barrier.body.velocity.x = (desired - barrier.body.position.x) / Math.max(delta, 0.001);
        barrier.mesh.position.copy(barrier.body.position as unknown as THREE.Vector3);
      }
      world.step(1 / 180, Math.min(delta, 0.05), 12);
      if (Math.abs(player.position.x) > 2.45 || player.position.z > 2 || player.position.z < -9.9 || player.position.y < -0.2) {
        player.position.set(latestCheckpoint.x, latestCheckpoint.y, latestCheckpoint.z);
        player.velocity.setZero(); player.angularVelocity.setZero(); resets++;
      }
      if (experiment.mode === 'pulse') {
        targets.forEach((target, index) => {
          if (Math.hypot(target.position.x, target.position.z) > 1.27 && !collectibles.has(index)) { collectibles.add(index); world.removeBody(target); }
        });
        gates = collectibles.size;
        if (gates === targets.length) complete(true);
      } else {
        const gate = gateMeshes[gates];
        if (gate && Math.hypot(player.position.x - gate.position.x, player.position.z - gate.position.z) < 0.35 && Math.abs(player.position.y - gate.position.y) < (experiment.mode === 'sky' ? 0.27 : 0.5)) {
          (gate.material as THREE.MeshStandardMaterial).color.setHex(0x61cba1);
          latestCheckpoint.set(gate.position.x, height(gate.position.x, gate.position.z) + 0.10, gate.position.z - 0.05);
          const pickup = group.getObjectByName(`pickup-${gates}`);
          if (pickup) pickup.visible = false;
          gates++;
          if (gates === 4) complete(true);
        }
      }
      if (experiment.mode === 'sprint' && elapsed >= 70 - experiment.difficulty * 6 && !finished) complete(false);
    }
    const hero = stage.marbles.meshes[0];
    hero.position.set(player.position.x, player.position.y, player.position.z);
    hero.quaternion.set(player.quaternion.x, player.quaternion.y, player.quaternion.z, player.quaternion.w);
    targets.forEach((body, index) => {
      stage.marbles.meshes[index + 1].position.set(body.position.x, body.position.y, body.position.z);
      stage.marbles.meshes[index + 1].quaternion.set(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w);
    });
    cameraTarget.set(player.position.x, player.position.y + 0.12, player.position.z - 0.4);
    cameraPosition.set(player.position.x + 0.23, player.position.y + 0.64, player.position.z + 1.55);
    stage.camera.position.lerp(cameraPosition, Math.min(1, delta * 4));
    stage.controls.target.lerp(cameraTarget, Math.min(1, delta * 5));
    pulseTime += delta;
    pulseMesh.visible = pulseTime < 0.55;
    pulseMesh.scale.setScalar(0.1 + pulseTime * 2.8);
    (pulseMesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.7 - pulseTime * 1.3);
    hud.querySelector('#run-time')!.textContent = experiment.mode === 'sprint' ? `${Math.max(0, 70 - experiment.difficulty * 6 - elapsed).toFixed(1)}s` : `${elapsed.toFixed(1)}s`;
    hud.querySelector('#run-progress')!.textContent = `${gates} / ${experiment.mode === 'pulse' ? targets.length : 4}`;
    hud.querySelector('#run-checkpoint')!.textContent = `${text('Checkpoint', 'نقطة حفظ')} ${Math.min(gates + 1, 4)}`;
    hud.querySelector('#glide-charge')!.textContent = glideRemaining.toFixed(1);
    hud.querySelector('#pulse-charge')!.textContent = String(pulseCharges);
    hud.querySelector<HTMLButtonElement>('#power-jump')!.disabled = !onGround() || jumpCooldown > 0 || finished;
    hud.querySelector<HTMLButtonElement>('#power-glide')!.disabled = glideRemaining <= 0 || finished;
    hud.querySelector<HTMLButtonElement>('#power-pulse')!.disabled = pulseCharges <= 0 || finished;
    hud.querySelector('#power-glide')!.setAttribute('aria-pressed', String(gliding));
    stage.marbles.sync();
  }

  function leave() {
    if (!active) { closeMenu(); return; }
    active = false; paused = false; inputs.clear(); menu.close();
    clearCourse();
    stage.marbles.uniforms.uTerrainEnabled.value = 0;
    stage.controls.enabled = true;
    stage.controls.enableDamping = true;
    stage.setDepthOfField(true);
    hud.hidden = true;
    document.body.classList.remove('experimental-play');
    resumeStory();
  }

  menu.addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button');
    if (!button) return;
    if (button.dataset.mode) { selectedMode = button.dataset.mode as ExperimentMode; renderMenu(); }
    if (button.dataset.experiment) launch(button.dataset.experiment);
    if (button.id === 'close-lab') closeMenu();
  });
  menu.addEventListener('cancel', (event) => { event.preventDefault(); closeMenu(); });
  menu.querySelector('#difficulty-filter')!.addEventListener('change', (event) => { selectedDifficulty = Number((event.target as HTMLSelectElement).value); renderMenu(); });
  menu.querySelector('#idea-search')!.addEventListener('input', (event) => { selectedSearch = (event.target as HTMLInputElement).value; renderMenu(); });
  hud.querySelector('#leave-lab')!.addEventListener('click', leave);
  hud.querySelector('#run-menu')!.addEventListener('click', open);
  hud.querySelector('#run-restart')!.addEventListener('click', () => launch(experiment.id));
  hud.querySelector('#run-again')!.addEventListener('click', () => {
    if (paused && !finished) { paused = false; hud.querySelector<HTMLElement>('#run-result')!.hidden = true; }
    else launch(experiment.id);
  });
  hud.querySelector('#run-next')!.addEventListener('click', () => { const courses = EXPERIMENTS.filter((item) => item.mode === experiment.mode); launch(courses[experiment.stage % 40].id); });
  for (const kind of ['jump', 'glide', 'pulse'] as const) hud.querySelector(`#power-${kind}`)!.addEventListener('click', () => power(kind));
  hud.querySelectorAll<HTMLElement>('[data-move]').forEach((button) => {
    button.addEventListener('pointerdown', (event) => { event.preventDefault(); inputs.add(button.dataset.move!); button.setPointerCapture(event.pointerId); });
    for (const action of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(action, () => inputs.delete(button.dataset.move!));
  });
  function saveReview() {
    const verdict = hud.querySelector<HTMLInputElement>('[name="run-verdict"]:checked')?.value as SavedReview['verdict'] | undefined;
    saved.reviews[experiment.id] = { verdict: verdict ?? null, note: hud.querySelector<HTMLTextAreaElement>('#run-note')!.value };
    persist();
  }
  hud.querySelectorAll('[name="run-verdict"]').forEach((input) => input.addEventListener('change', saveReview));
  hud.querySelector('#run-note')!.addEventListener('input', saveReview);
  const keyMap: Record<string, string> = { KeyW: 'forward', ArrowUp: 'forward', KeyS: 'backward', ArrowDown: 'backward', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right' };
  addEventListener('keydown', (event) => {
    if (!active || paused || event.target instanceof Element && event.target.closest('input, textarea, select')) return;
    if (keyMap[event.code]) { event.preventDefault(); inputs.add(keyMap[event.code]); }
    if (!event.repeat && event.code === 'Space') { event.preventDefault(); power('jump'); }
    if (!event.repeat && event.code === 'KeyE') power('pulse');
    if (!event.repeat && event.code === 'KeyF') power('glide');
    if (event.code === 'Escape') open();
  });
  addEventListener('keyup', (event) => { if (keyMap[event.code]) inputs.delete(keyMap[event.code]); });
  addEventListener('blur', () => inputs.clear());
  addEventListener('bely-language', () => {
    menu.querySelector('#difficulty-filter option[value="0"]')!.textContent = text('All difficulties', 'كل الصعوبات');
    menu.querySelectorAll<HTMLOptionElement>('#difficulty-filter option').forEach((option) => { if (option.value !== '0') option.textContent = `${text('Tier', 'المستوى')} ${option.value}`; });
    menu.querySelector<HTMLInputElement>('#idea-search')!.placeholder = text('Find a scenario', 'ابحث عن تجربة');
    menu.querySelector('#idea-search')!.setAttribute('aria-label', text('Find a scenario', 'ابحث عن تجربة'));
    if (menu.open) renderMenu();
  });
  return {
    open, launch, leave, tick, power,
    state: () => ({ active, paused, experiment: experiment.id, mode: experiment.mode, difficulty: experiment.difficulty, elapsed, gates, resets, won, finished, grounded: active && onGround(), pulseCharges, glideRemaining, position: [player.position.x, player.position.y, player.position.z], originalMatch: startingSnapshot?.levelId, reviews: Object.keys(saved.reviews).length }),
    setInput(direction: string, pressed: boolean) { if (pressed) inputs.add(direction); else inputs.delete(direction); },
  };
}

export type Playground = ReturnType<typeof createPlayground>;