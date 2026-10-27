import './game.css';
import { createIcons, Camera, ScanEye, Sun, CloudSun, Moon, Orbit, Crosshair, Grid2x2, Play, Pause, Settings2, Maximize, BookOpen, EyeOff, RotateCcw, ArrowUpRight } from 'lucide';
import { createStreet } from './scene';
import { createGame } from './game';
import type { Look, View } from './scene';
import type { MatchMode } from './physics';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <main id="stage"></main>
  <div class="hud">
    <header class="topbar">
      <div class="identity"><h1>BELY</h1><p>Glass &amp; Dust<br>Browser study 01</p></div>
      <nav class="tools" aria-label="Scene tools">
        <a class="icon-button" href="/devlog.html" aria-label="Open photo dev log" data-tooltip="Photo dev log"><i data-lucide="book-open"></i></a>
        <button class="icon-button" id="reset" aria-label="New round" data-tooltip="New round"><i data-lucide="rotate-ccw"></i></button>
        <button class="icon-button" id="capture" aria-label="Take a photograph" data-tooltip="Take a photograph"><i data-lucide="camera"></i></button>
        <button class="icon-button desktop-only" id="fullscreen" aria-label="Full screen" data-tooltip="Full screen"><i data-lucide="maximize"></i></button>
        <button class="icon-button" id="settings-toggle" aria-label="Settings" aria-expanded="false" data-tooltip="Settings"><i data-lucide="settings-2"></i></button>
      </nav>
    </header>
    <section class="scene-label"><p class="eyebrow">01 / Haret el Nour</p><h2 id="look-title">After school</h2><p class="location">Cairo, Egypt</p><div class="scoreline"><span><strong id="score">0</strong> / 7</span><span id="round-label">Solo practice</span></div><div class="score-dots" id="score-dots" aria-hidden="true">${'<span></span>'.repeat(7)}</div></section>
    <section class="settings" id="settings" aria-label="Rendering settings" hidden>
      <h2>Picture &amp; Camera</h2>
      <label class="setting">Match<select id="match-mode"><option value="practice">Solo practice</option><option value="challenge">Seven shots</option></select></label>
      <label class="setting">Resolution<select id="quality"><option value="high">High</option><option value="ultra">Ultra</option><option value="balanced">Balanced</option></select></label>
      <label class="setting">Depth of field<input type="checkbox" id="depth-of-field" checked></label>
      <label class="setting">Sound<input type="checkbox" id="sound" checked></label>
      <label class="setting">Exposure<input type="range" id="exposure" min="0.5" max="1.8" step="0.05" value="1.12"></label>
      <button class="icon-button" id="hide-hud" aria-label="Hide interface" data-tooltip="Hide interface"><i data-lucide="eye-off"></i></button>
    </section>
    <section class="shot-panel" aria-label="Shot controls">
      <div class="shot-heading"><p class="eyebrow" id="shot-label">Flick 01</p></div>
      <label class="aim-field"><span>Aim <output id="angle-value">-6&#176;</output></span><input type="range" id="angle" aria-label="Shot angle" min="-180" max="180" step="0.5" value="-6"></label>
      <label class="aim-field"><span>Power <output id="power-value">58%</output></span><input type="range" id="power" aria-label="Shot power" min="5" max="100" step="1" value="58"></label>
      <button class="fire-button" id="flick" aria-label="Flick marble"><i data-lucide="arrow-up-right"></i><span>Flick</span></button>
    </section>
    <section class="round-result" id="round-result" role="status" hidden><p class="eyebrow">Round complete</p><h2 id="result-title">Circle cleared</h2><p id="result-detail"></p><button id="play-again"><i data-lucide="rotate-ccw"></i>New round</button></section>
    <div class="dock">
      <div class="segmented" aria-label="Lighting">
        <button data-look="afternoon" aria-label="After school lighting" aria-pressed="true" title="After school"><i data-lucide="sun"></i><span>After school</span></button>
        <button data-look="overcast" aria-label="Soft daylight" aria-pressed="false" title="Soft daylight"><i data-lucide="cloud-sun"></i><span>Soft daylight</span></button>
        <button data-look="evening" aria-label="Blue hour" aria-pressed="false" title="Blue hour"><i data-lucide="moon"></i><span>Blue hour</span></button>
      </div>
      <div class="dock-divider"></div>
      <div class="segmented" aria-label="Camera views">
        <button data-view="street" aria-label="Street view" aria-pressed="true" title="Street"><i data-lucide="orbit"></i></button>
        <button data-view="aim" aria-label="Aiming view" aria-pressed="false" title="Aim"><i data-lucide="crosshair"></i></button>
        <button data-view="overhead" aria-label="Overhead view" aria-pressed="false" title="Overhead"><i data-lucide="grid-2x2"></i></button>
        <button data-view="macro" aria-label="Inspect glass" aria-pressed="false" title="Inspect glass"><i data-lucide="scan-eye"></i></button>
        <button id="tour" aria-label="Start camera tour" aria-pressed="false" title="Camera tour"><i data-lucide="play"></i></button>
      </div>
    </div>
    <div class="footer-note"><span class="status-dot"></span>LIVE / STUDY 01</div>
    <output class="performance" id="performance">-- FPS</output>
    <div class="toast" id="toast" role="status" hidden></div>
  </div>
  <section class="loading" id="loading"><h1>BELY</h1><p id="loading-message">Opening the street</p><progress aria-label="Loading scene"></progress></section>
`;

const icons = { Camera, ScanEye, Sun, CloudSun, Moon, Orbit, Crosshair, Grid2x2, Play, Pause, Settings2, Maximize, BookOpen, EyeOff, RotateCcw, ArrowUpRight };
createIcons({ icons });
const loading = document.querySelector<HTMLElement>('#loading')!;

async function start() {
  const stage = await createStreet(document.querySelector('#stage')!, (message) => {
    document.querySelector('#loading-message')!.textContent = message;
  });
  let toastTimer: ReturnType<typeof setTimeout>;
  function toast(message: string) {
    const element = document.querySelector<HTMLElement>('#toast')!;
    element.textContent = message;
    element.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { element.hidden = true; }, 2400);
  }
  const game = createGame(stage, {
    onChange(state) {
      document.querySelector('#score')!.textContent = String(state.score);
      document.querySelector('#round-label')!.textContent = state.mode === 'practice' ? 'Solo practice' : `${Math.max(0, 7 - state.shots)} shots left`;
      document.querySelectorAll('#score-dots span').forEach((element, index) => element.classList.toggle('collected', index < state.score));
      document.querySelector('#shot-label')!.textContent = state.active ? 'In play' : `Flick ${String(state.shots + 1).padStart(2, '0')}`;
      document.querySelector<HTMLButtonElement>('#flick')!.disabled = state.active || state.roundOver;
      document.querySelector<HTMLInputElement>('#angle')!.disabled = state.active || state.roundOver;
      document.querySelector<HTMLInputElement>('#power')!.disabled = state.active || state.roundOver;
      document.querySelector<HTMLElement>('#round-result')!.hidden = !state.roundOver;
      if (state.roundOver) {
        document.querySelector('#result-title')!.textContent = state.won ? 'Circle cleared' : 'Seven shots';
        document.querySelector('#result-detail')!.textContent = `${state.score} marbles collected in ${state.shots} flick${state.shots === 1 ? '' : 's'}.`;
      }
    },
    onAim(angle, power) {
      document.querySelector<HTMLInputElement>('#angle')!.value = String(angle);
      document.querySelector<HTMLInputElement>('#power')!.value = String(Math.round(power * 100));
      document.querySelector('#angle-value')!.textContent = `${Math.round(angle)}\u00b0`;
      document.querySelector('#power-value')!.textContent = `${Math.round(power * 100)}%`;
    },
  });
  document.querySelector('#flick')!.addEventListener('click', () => game.shoot());
  document.querySelector('#reset')!.addEventListener('click', () => game.reset());
  document.querySelector('#play-again')!.addEventListener('click', () => game.reset());
  document.querySelector('#match-mode')!.addEventListener('change', (event) => game.reset((event.target as HTMLSelectElement).value as MatchMode));
  document.querySelector('#sound')!.addEventListener('change', (event) => game.setSound((event.target as HTMLInputElement).checked));
  for (const selector of ['#angle', '#power']) {
    document.querySelector(selector)!.addEventListener('input', () => game.setAim(Number(document.querySelector<HTMLInputElement>('#angle')!.value), Number(document.querySelector<HTMLInputElement>('#power')!.value) / 100));
  }
  document.querySelectorAll<HTMLButtonElement>('[data-look]').forEach((button) => button.addEventListener('click', () => {
    const look = button.dataset.look as Look;
    stage.setLook(look);
    document.querySelectorAll('[data-look]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    document.querySelector('#look-title')!.textContent = { afternoon: 'After school', overcast: 'Soft daylight', evening: 'Blue hour' }[look];
    document.querySelector<HTMLInputElement>('#exposure')!.value = String(stage.renderer.toneMappingExposure);
  }));
  document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach((button) => button.addEventListener('click', () => {
    stage.setView(button.dataset.view as View);
    document.querySelectorAll('[data-view]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
  }));
  const tourButton = document.querySelector<HTMLButtonElement>('#tour')!;
  tourButton.addEventListener('click', () => {
    const enabled = !stage.getState().touring;
    stage.setTour(enabled);
    tourButton.setAttribute('aria-pressed', String(enabled));
    tourButton.setAttribute('aria-label', enabled ? 'Stop camera tour' : 'Start camera tour');
    tourButton.innerHTML = `<i data-lucide="${enabled ? 'pause' : 'play'}"></i>`;
    createIcons({ icons });
  });
  document.querySelector('#settings-toggle')!.addEventListener('click', () => {
    const panel = document.querySelector<HTMLElement>('#settings')!;
    panel.hidden = !panel.hidden;
    document.querySelector('#settings-toggle')!.setAttribute('aria-expanded', String(!panel.hidden));
  });
  document.querySelector('#quality')!.addEventListener('change', (event) => stage.setQuality((event.target as HTMLSelectElement).value));
  document.querySelector('#depth-of-field')!.addEventListener('change', (event) => stage.setDepthOfField((event.target as HTMLInputElement).checked));
  document.querySelector('#exposure')!.addEventListener('input', (event) => { stage.renderer.toneMappingExposure = Number((event.target as HTMLInputElement).value); });
  document.querySelector('#fullscreen')!.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch { toast('Full screen is unavailable in this browser'); }
  });
  document.querySelector('#capture')!.addEventListener('click', () => {
    stage.render(0);
    stage.renderer.domElement.toBlob((blob) => {
      if (!blob) return;
      const anchor = document.createElement('a');
      anchor.href = URL.createObjectURL(blob);
      anchor.download = `bely-${stage.getState().look}-${Date.now()}.png`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(anchor.href), 1000);
      toast('Photograph captured');
    });
  });
  document.querySelector('#hide-hud')!.addEventListener('click', () => document.body.classList.add('hidden-hud'));
  addEventListener('keydown', (event) => {
    if (event.key === 'Escape') document.body.classList.remove('hidden-hud');
    if (event.key.toLowerCase() === 'h') document.body.classList.toggle('hidden-hud');
  });
  stage.renderer.domElement.addEventListener('dblclick', () => document.body.classList.remove('hidden-hud'));
  const frameTimes: number[] = [];
  const review = {
    ready: true,
    state: () => ({ ...stage.getState(), match: game.snapshot(), camera: stage.camera.position.toArray(), target: stage.controls.target.toArray(), marbles: stage.marbles.meshes.map((mesh) => mesh.position.toArray()) }),
    view: stage.setView,
    look: stage.setLook,
    tour: stage.setTour,
    render: () => stage.render(0),
    hideUI: (hide: boolean) => document.body.classList.toggle('hidden-hud', hide),
    depthOfField: stage.setDepthOfField,
    shoot: game.shoot,
    reset: game.reset,
    aim: game.setAim,
    projectMarbles: () => {
      const rect = stage.renderer.domElement.getBoundingClientRect();
      return stage.marbles.meshes.map((mesh, index) => {
        const point = mesh.position.clone().project(stage.camera);
        const viewPoint = mesh.position.clone().applyMatrix4(stage.camera.matrixWorldInverse);
        const radius = mesh.scale.x / (-viewPoint.z) * rect.height / (2 * Math.tan(stage.camera.fov * Math.PI / 360));
        return { index, visible: mesh.visible && point.z >= -1 && point.z <= 1, x: rect.left + (point.x + 1) * rect.width / 2, y: rect.top + (1 - point.y) * rect.height / 2, radius };
      });
    },
    performance: () => {
      const ordered = [...frameTimes].sort((first, second) => first - second);
      return { fps: frameTimes.length * 1000 / frameTimes.reduce((sum, time) => sum + time, 0), p95Milliseconds: ordered[Math.floor(ordered.length * 0.95)], frames: frameTimes.length };
    },
    camera: (position: number[], target: number[]) => {
      stage.setTour(false);
      stage.controls.enableDamping = false;
      stage.controls.update();
      stage.camera.position.fromArray(position);
      stage.controls.target.fromArray(target);
      stage.controls.update();
      stage.render(0);
    },
    pixels: () => {
      stage.render(0);
      const context = stage.renderer.getContext();
      const pixels = new Uint8Array(context.drawingBufferWidth * context.drawingBufferHeight * 4);
      context.readPixels(0, 0, context.drawingBufferWidth, context.drawingBufferHeight, context.RGBA, context.UNSIGNED_BYTE, pixels);
      let hash = 2166136261;
      let brightness = 0;
      for (let index = 0; index < pixels.length; index += 4) {
        hash = Math.imul(hash ^ pixels[index], 16777619) >>> 0;
        hash = Math.imul(hash ^ pixels[index + 1], 16777619) >>> 0;
        hash = Math.imul(hash ^ pixels[index + 2], 16777619) >>> 0;
        brightness += pixels[index] + pixels[index + 1] + pixels[index + 2];
      }
      const extension = context.getExtension('WEBGL_debug_renderer_info');
      return { hash, meanBrightness: brightness / (pixels.length / 4 * 3), width: context.drawingBufferWidth, height: context.drawingBufferHeight, gpu: extension ? context.getParameter(extension.UNMASKED_RENDERER_WEBGL) : 'Not disclosed' };
    },
  };
  Object.assign(window, { __bely: review });
  document.body.dataset.ready = 'true';
  loading.classList.add('done');
  setTimeout(() => loading.hidden = true, 400);
  let lastTime = performance.now();
  let frameTime = 0;
  let frameCount = 0;
  let previousTour = false;
  function animate(now: number) {
    const elapsed = (now - lastTime) / 1000;
    const delta = Math.min(elapsed, 0.05);
    lastTime = now;
    game.tick(delta);
    stage.render(delta);
    const touring = stage.getState().touring;
    if (touring !== previousTour) {
      previousTour = touring;
      tourButton.setAttribute('aria-pressed', String(touring));
      tourButton.setAttribute('aria-label', touring ? 'Stop camera tour' : 'Start camera tour');
      tourButton.innerHTML = `<i data-lucide="${touring ? 'pause' : 'play'}"></i>`;
      createIcons({ icons });
    }
    frameTimes.push(elapsed * 1000);
    if (frameTimes.length > 240) frameTimes.shift();
    frameTime += elapsed;
    frameCount++;
    if (frameTime >= 0.75) {
      document.querySelector('#performance')!.textContent = `${Math.round(frameCount / frameTime)} FPS / ${stage.renderer.domElement.width} x ${stage.renderer.domElement.height}`;
      frameTime = 0;
      frameCount = 0;
    }
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
}

start().catch((error: unknown) => {
  console.error(error);
  document.querySelector('#loading-message')!.textContent = `The scene could not start. ${error instanceof Error ? error.message : 'WebGL 2 is required.'}`;
  document.querySelector('progress')!.hidden = true;
});
