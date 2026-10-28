import './game.css';
import { SkipForward, MessageSquare } from 'lucide';
import { language, setLanguage, t, translateStatic } from './locale';
import type { Language } from './locale';
import { pageUrl } from './urls';
import { createIcons, Camera, ScanEye, Sun, CloudSun, Moon, Orbit, Crosshair, Grid2x2, Play, Pause, Settings2, Maximize, BookOpen, EyeOff, RotateCcw, ArrowUpRight, MapPinned, Gem, Star, Award, ArrowRight, Eye, LockKeyhole, X, Check, CalendarDays, CornerUpRight, CircleDot, Swords, History, Target, FlaskConical, Route, Zap, Wind, Timer, Package, LayoutGrid, LogOut, ArrowUp, ArrowDown, ArrowLeft, ArrowUpFromLine } from 'lucide';
import { createStreet } from './scene';
import { createGame } from './game';
import { createJourney } from './journey';
import { createPlayground } from './playground';
import { createCinematics } from './cinematics';
import type { Journey } from './journey';
import type { Look, View } from './scene';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <main id="stage"></main>
  <div class="hud">
    <header class="topbar">
      <div class="identity"><h1 data-i18n="BELY">BELY</h1><p><span data-i18n="Kings of the Hara">Kings of the Hara</span><br><span data-i18n="The neighborhood circuit">The neighborhood circuit</span></p></div>
      <nav class="campaign-actions" aria-label="Your journey"><button id="open-journey"><i data-lucide="map-pinned"></i><span data-i18n="Journey">Journey</span><span class="nav-medals" id="journey-stars">0 / 36</span></button><button id="open-collection"><i data-lucide="gem"></i><span data-i18n="Marble tin">Marble tin</span></button><button id="open-daily"><i data-lucide="calendar-days"></i><span data-i18n="Daily">Daily</span></button><button id="open-play-lab"><i data-lucide="flask-conical"></i><span>${t('Play Lab')}</span></button></nav>
      <nav class="tools" aria-label="Scene tools">
        <a class="icon-button" href="${pageUrl('devlog.html')}" target="_blank" rel="noopener" aria-label="Open photo dev log" data-tooltip="Photo dev log"><i data-lucide="book-open"></i></a>
        <button class="icon-button" id="reset" aria-label="New round" data-tooltip="New round"><i data-lucide="rotate-ccw"></i></button>
        <button class="icon-button" id="capture" aria-label="Take a photograph" data-tooltip="Take a photograph"><i data-lucide="camera"></i></button>
        <button class="icon-button desktop-only" id="fullscreen" aria-label="Full screen" data-tooltip="Full screen"><i data-lucide="maximize"></i></button>
        <button class="icon-button" id="settings-toggle" aria-label="Settings" aria-expanded="false" data-tooltip="Settings"><i data-lucide="settings-2"></i></button>
      </nav>
    </header>
    <section class="scene-label"><p class="eyebrow" id="arena-label">01 / Haret el Nour</p><h2 id="event-name">First Flick</h2><p class="objective" id="objective">Knock 2 marbles out of the circle</p><p class="location"><span id="location-label">Cairo</span> &middot; <span id="look-title">After school</span></p><div class="scoreline"><span><strong id="score">0</strong> / <span id="score-goal">2</span></span><span id="round-label">5 shots left</span></div><div class="score-dots" id="score-dots" aria-hidden="true"></div><p class="event-rule" id="event-rule">Circle knockout</p></section>
    <section class="rival-card" id="rival-card" hidden><p class="eyebrow" id="rival-phase">Your turn</p><h2 id="rival-name"></h2><p id="rival-title"></p><div class="rival-scoreboard"><span>You <strong id="rival-player-score">0</strong></span><span class="score-divider">:</span><strong id="rival-score">0</strong></div><p id="rival-quip"></p></section>
    <section class="settings" id="settings" aria-label="Rendering settings" hidden>
      <h2 data-i18n="Picture & Camera">Picture &amp; Camera</h2>
      <label class="setting"><span data-i18n="Language">Language</span><select id="language"><option value="en">English</option><option value="ar">العربية</option></select></label>
      <label class="setting"><span data-i18n="Unlock all levels">Unlock all levels</span><input type="checkbox" id="debug-unlock"></label>
      <label class="setting"><span data-i18n="Skip all introductions">Skip all introductions</span><input type="checkbox" id="skip-intros"></label>
      <label class="setting"><span data-i18n="Voice narration">Voice narration</span><input type="checkbox" id="voice-narration"></label>
      <button class="story-replay" id="replay-story" data-i18n="Replay introduction">Replay introduction</button>
      <label class="setting"><span data-i18n="Aim guide">Aim guide</span><input type="checkbox" id="aim-assist" checked></label>
      <label class="setting"><span data-i18n="Resolution">Resolution</span><select id="quality"><option value="high" data-i18n="High">High</option><option value="ultra" data-i18n="Ultra">Ultra</option><option value="balanced" data-i18n="Balanced">Balanced</option></select></label>
      <label class="setting"><span data-i18n="Depth of field">Depth of field</span><input type="checkbox" id="depth-of-field" checked></label>
      <label class="setting"><span data-i18n="Sound">Sound</span><input type="checkbox" id="sound" checked></label>
      <label class="setting"><span data-i18n="Exposure">Exposure</span><input type="range" id="exposure" min="0.5" max="1.8" step="0.05" value="1.12"></label>
      <button class="icon-button" id="hide-hud" aria-label="Hide interface" data-tooltip="Hide interface"><i data-lucide="eye-off"></i></button>
    </section>
    <section class="shot-panel" aria-label="Shot controls">
      <div class="shot-heading"><p class="eyebrow" id="shot-label">Your shot 01</p><button class="icon-button" id="line-up" aria-label="Line up a target" title="Line up a target"><i data-lucide="target"></i></button></div>
      <label class="aim-field"><span><span data-i18n="Aim">Aim</span><output id="angle-value">-6&#176;</output></span><input type="range" id="angle" aria-label="Shot angle" min="-180" max="180" step="0.5" value="-6"></label>
      <label class="aim-field"><span><span data-i18n="Power">Power</span><output id="power-value">58%</output></span><input type="range" id="power" aria-label="Shot power" min="5" max="100" step="1" value="58"></label>
      <button class="fire-button" id="flick" aria-label="Flick marble"><i data-lucide="arrow-up-right"></i><span data-i18n="Flick">Flick</span></button>
    </section>
    <section class="round-result" id="round-result" role="status" hidden><p class="eyebrow" id="result-kicker">Event complete</p><h2 id="result-title">Event cleared</h2><div class="medal-stars" id="result-stars"></div><p id="result-detail"></p><div id="result-unlocks" class="result-unlocks"></div><button id="next-event" class="next-event">Next event<i data-lucide="arrow-right"></i></button><div class="result-actions"><button id="play-again"><i data-lucide="rotate-ccw"></i><span data-i18n="Retry">Retry</span></button><button id="result-journey"><i data-lucide="map-pinned"></i><span data-i18n="Journey">Journey</span></button><button id="result-replay" aria-label="Replay last shot" title="Replay last shot"><i data-lucide="history"></i></button></div></section>
    <div class="preview-actions"><span data-i18n="Arena preview">Arena preview</span><button id="leave-preview"><i data-lucide="map-pinned"></i><span data-i18n="Back to journey">Back to journey</span></button></div>
    <div class="chapter-banner" id="chapter-banner" aria-hidden="true"></div>
    <div class="dock">
      <div class="segmented" aria-label="Lighting">
        <button data-look="afternoon" aria-label="After school lighting" aria-pressed="true" title="After school"><i data-lucide="sun"></i><span data-i18n="After school">After school</span></button>
        <button data-look="overcast" aria-label="Soft daylight" aria-pressed="false" title="Soft daylight"><i data-lucide="cloud-sun"></i><span data-i18n="Soft daylight">Soft daylight</span></button>
        <button data-look="evening" aria-label="Blue hour" aria-pressed="false" title="Blue hour"><i data-lucide="moon"></i><span data-i18n="Blue hour">Blue hour</span></button>
      </div>
      <div class="dock-divider"></div>
      <div class="segmented" aria-label="Camera views">
        <button data-view="vista" aria-label="Explore arena" aria-pressed="false" title="Explore arena"><i data-lucide="map-pinned"></i></button>
        <button data-view="street" aria-label="Street view" aria-pressed="true" title="Street"><i data-lucide="orbit"></i></button>
        <button data-view="aim" aria-label="Aiming view" aria-pressed="false" title="Aim"><i data-lucide="crosshair"></i></button>
        <button data-view="overhead" aria-label="Overhead view" aria-pressed="false" title="Overhead"><i data-lucide="grid-2x2"></i></button>
        <button data-view="macro" aria-label="Inspect glass" aria-pressed="false" title="Inspect glass"><i data-lucide="scan-eye"></i></button>
        <button id="replay" aria-label="Replay shot" aria-pressed="false" title="Replay shot" disabled><i data-lucide="history"></i></button>
        <button id="tour" aria-label="Start camera tour" aria-pressed="false" title="Camera tour"><i data-lucide="play"></i></button>
      </div>
    </div>
    <div class="footer-note"><span class="status-dot"></span><span id="debug-badge" hidden>DEBUG</span><span id="save-state">Local journey</span></div>
    <output class="performance" id="performance">-- FPS</output>
    <div class="toast" id="toast" role="status" hidden></div>
  </div>
  <section class="loading" id="loading"><h1 data-i18n="BELY">BELY</h1><p id="loading-message" data-i18n="Preparing your journey">Preparing your journey</p><progress aria-label="Loading scene"></progress></section>
`;

const icons = { Camera, ScanEye, Sun, CloudSun, Moon, Orbit, Crosshair, Grid2x2, Play, Pause, Settings2, Maximize, BookOpen, EyeOff, RotateCcw, ArrowUpRight, MapPinned, Gem, Star, Award, ArrowRight, Eye, LockKeyhole, X, Check, CalendarDays, CornerUpRight, CircleDot, Swords, History, Target, FlaskConical, Route, Zap, Wind, Timer, Package, LayoutGrid, LogOut, ArrowUp, ArrowDown, ArrowLeft, ArrowUpFromLine, SkipForward, MessageSquare };
createIcons({ icons });
translateStatic();
document.querySelector<HTMLSelectElement>('#language')!.value = language();
document.querySelector('#language')!.addEventListener('change', (event) => { void setLanguage((event.target as HTMLSelectElement).value as Language); });
const loading = document.querySelector<HTMLElement>('#loading')!;

async function start() {
  const stage = await createStreet(document.querySelector('#stage')!, (message) => {
    document.querySelector('#loading-message')!.textContent = language() === 'ar' ? t('Preparing your journey') : message;
  });
  let toastTimer: ReturnType<typeof setTimeout>;
  function toast(message: string) {
    const element = document.querySelector<HTMLElement>('#toast')!;
    element.textContent = message;
    element.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { element.hidden = true; }, 2400);
  }
  let journey: Journey | undefined;
  const game = createGame(stage, {
    onChange(state) {
      document.querySelector('#score')!.textContent = String(state.score);
      document.querySelector('#score-goal')!.textContent = String(state.goal);
      document.querySelector('#round-label')!.textContent = state.rule === 'duel' ? t(state.turn === 'player' ? 'Your turn' : 'Rival turn') : state.shotLimit ? t('{{count}} shots left', { count: Math.max(0, state.shotLimit - state.shots) }) : t('Free play');
      document.querySelectorAll('#score-dots span').forEach((element, index) => element.classList.toggle('collected', index < state.score));
      document.querySelector('#shot-label')!.textContent = state.replaying ? `${t('Replay')} / 0.72x` : state.active ? t('In play') : state.turn === 'rival' ? t('Rival lining up') : t('Your shot {{shot}}', { shot: String(state.shots + 1).padStart(2, '0') });
      const disabled = state.active || state.roundOver || state.paused || state.preview || state.replaying || state.turn !== 'player';
      document.querySelector<HTMLButtonElement>('#flick')!.disabled = disabled;
      document.querySelector<HTMLInputElement>('#angle')!.disabled = disabled;
      document.querySelector<HTMLInputElement>('#power')!.disabled = disabled;
      document.querySelector<HTMLButtonElement>('#line-up')!.disabled = disabled;
      const replayButton = document.querySelector<HTMLButtonElement>('#replay')!;
      replayButton.disabled = state.active || state.preview || state.paused || !state.canReplay;
      replayButton.setAttribute('aria-pressed', String(state.replaying));
      replayButton.setAttribute('aria-label', t(state.replaying ? 'Stop replay' : 'Replay shot'));
      document.body.classList.toggle('replaying', state.replaying);
      document.querySelector<HTMLElement>('#round-result')!.hidden = !state.roundOver || state.replaying || state.paused;
      journey?.onState(state);
    },
    onAim(angle, power) {
      document.querySelector<HTMLInputElement>('#angle')!.value = String(angle);
      document.querySelector<HTMLInputElement>('#power')!.value = String(Math.round(power * 100));
      document.querySelector('#angle-value')!.textContent = `${Math.round(angle)}\u00b0`;
      document.querySelector('#power-value')!.textContent = `${Math.round(power * 100)}%`;
    },
  });
  journey = createJourney(game, stage, () => createIcons({ icons }), toast);
  const cinematic = createCinematics(stage, game, () => createIcons({ icons }));
  document.querySelector<HTMLInputElement>('#skip-intros')!.checked = cinematic.state().skipAll;
  document.querySelector<HTMLInputElement>('#depth-of-field')!.checked = stage.getState().depthOfField;
  document.querySelector<HTMLSelectElement>('#quality')!.value = stage.getState().mobileProfile ? 'balanced' : 'high';
  journey.start();
  const playground = createPlayground(stage, game, () => createIcons({ icons }), () => { journey!.resume(); });
  document.querySelector('#open-play-lab')!.addEventListener('click', () => { cinematic.skip(); playground.open(); });
  document.querySelector('#skip-intros')!.addEventListener('change', (event) => cinematic.setSkipAll((event.target as HTMLInputElement).checked));
  document.querySelector('#voice-narration')!.addEventListener('change', (event) => cinematic.setVoice((event.target as HTMLInputElement).checked));
  document.querySelector('#replay-story')!.addEventListener('click', () => { document.querySelector<HTMLElement>('#settings')!.hidden = true; void cinematic.replay(); });
  window.addEventListener('bely-language', () => game.refresh());
  document.querySelector('#flick')!.addEventListener('click', () => game.shoot());
  document.querySelector('#reset')!.addEventListener('click', () => journey!.retry());
  document.querySelector('#line-up')!.addEventListener('click', () => game.lineUp());
  document.querySelector('#replay')!.addEventListener('click', () => game.replay());
  document.querySelector('#sound')!.addEventListener('change', (event) => game.setSound((event.target as HTMLInputElement).checked));
  for (const selector of ['#angle', '#power']) {
    document.querySelector(selector)!.addEventListener('input', () => game.setAim(Number(document.querySelector<HTMLInputElement>('#angle')!.value), Number(document.querySelector<HTMLInputElement>('#power')!.value) / 100));
  }
  document.querySelectorAll<HTMLButtonElement>('[data-look]').forEach((button) => button.addEventListener('click', () => {
    const look = button.dataset.look as Look;
    stage.setLook(look);
    document.querySelectorAll('[data-look]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    document.querySelector('#look-title')!.textContent = t({ afternoon: 'After school', overcast: 'Soft daylight', evening: 'Blue hour' }[look]);
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
    } catch { toast(t('Full screen is unavailable in this browser')); }
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
      toast(t('Photograph captured'));
    });
  });
  document.querySelector('#hide-hud')!.addEventListener('click', () => document.body.classList.add('hidden-hud'));
  addEventListener('keydown', (event) => {
    if (event.key === 'Escape') document.body.classList.remove('hidden-hud');
    if (event.key.toLowerCase() === 'h' && !(event.target instanceof Element && event.target.closest('input, select, textarea'))) document.body.classList.toggle('hidden-hud');
  });
  stage.renderer.domElement.addEventListener('dblclick', () => document.body.classList.remove('hidden-hud'));
  const frameTimes: number[] = [];
  const review = {
    ready: true,
    state: () => ({ ...stage.getState(), match: game.snapshot(), journey: journey!.state(), camera: stage.camera.position.toArray(), target: stage.controls.target.toArray(), marbles: stage.marbles.meshes.map((mesh) => mesh.position.toArray()) }),
    view: stage.setView,
    look: stage.setLook,
    tour: stage.setTour,
    render: () => stage.render(0),
    hideUI: (hide: boolean) => document.body.classList.toggle('hidden-hud', hide),
    depthOfField: stage.setDepthOfField,
    shoot: game.shoot,
    reset: game.reset,
    aim: game.setAim,
    lineUp: game.lineUp,
    replay: game.replay,
    replayCount: game.replayCount,
    previewLevel: (id: string) => journey!.preview(id),
    playLevel: (id: string) => journey!.play(id),
    openJourney: (tab?: string) => journey!.open(tab),
    closeJourney: () => journey!.close(),
    previewSkin: (color: number, style: number, finish = 0, secondary = 0xc8e5dd) => stage.marbles.setSkin(color, style, finish, secondary),
    playground: { launch: playground.launch, leave: playground.leave, open: playground.open, state: playground.state, power: playground.power, input: playground.setInput },
    cinematic: { state: cinematic.state, skip: cinematic.skip, replay: cinematic.replay, freeze: cinematic.freeze, disable: cinematic.setSkipAll },
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
    if (document.body.classList.contains('showroom-open')) { requestAnimationFrame(animate); return; }
    game.tick(delta);
    playground.tick(delta);
    cinematic.tick(delta);
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
