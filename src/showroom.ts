import './game.css';
import './showroom.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createIcons, ArrowLeft, BookOpen, Camera, Maximize, RotateCw, Play, Pause, Focus, ArrowDownToLine, ScanEye, Grid2x2, MoveHorizontal, Gem, Check, LockKeyhole, Settings2 } from 'lucide';
import { createGlassMarbles, groundDeclarations } from './glass';
import { MARBLE_SKINS } from './marbles';
import type { MarbleSkin } from './marbles';
import { canEquip, parseProgress, SAVE_KEY } from './progression';
import { bilingual as text, isArabic, language, setLanguage } from './locale';
import type { Language } from './locale';
import { pageUrl, siteUrl } from './urls';

type Pose = 'hero' | 'low' | 'core' | 'top' | 'profile';
const icons = { ArrowLeft, BookOpen, Camera, Maximize, RotateCw, Play, Pause, Focus, ArrowDownToLine, ScanEye, Grid2x2, MoveHorizontal, Gem, Check, LockKeyhole, Settings2 };
const mobile = matchMedia('(pointer: coarse)').matches || innerWidth < 750;
const embedded = new URLSearchParams(location.search).get('embed') === '1' && parent !== window;
let progress = parseProgress(null);
try { progress = parseProgress(localStorage.getItem(SAVE_KEY)); } catch { progress = parseProgress(null); }
const requested = new URLSearchParams(location.search).get('skin');
let selected = MARBLE_SKINS.find((skin) => skin.id === requested) ?? MARBLE_SKINS.find((skin) => skin.id === progress.equipped) ?? MARBLE_SKINS[0];
let family = '';
let search = '';
let pose: Pose = 'hero';
let showcase = false;
let spinning = false;
let quality = mobile ? 'balanced' : 'high';
let environment: ReturnType<typeof createStudio> | undefined;

const root = document.querySelector<HTMLDivElement>('#showroom-app')!;
root.innerHTML = `
  <main id="studio" aria-label="${text('Marble showroom', 'استوديو البلي')}"></main>
  <header class="studio-header"><div class="studio-brand"><h1>${text('BELY', 'بلي')}</h1><span>${text('MARBLE STUDIO', 'استوديو البلي')}</span></div><nav aria-label="${text('Showroom tools', 'أدوات الاستوديو')}"><a class="icon-button" id="back-to-game" href="${pageUrl('index.html')}" aria-label="${text('Return to game', 'العودة للعبة')}" data-tooltip="${text('Return to game', 'العودة للعبة')}"><i data-lucide="arrow-left"></i></a><a class="icon-button" href="${pageUrl('devlog.html')}" aria-label="${text('Photo dev log', 'سجل التطوير المصور')}" data-tooltip="${text('Photo dev log', 'سجل التطوير المصور')}"><i data-lucide="book-open"></i></a><button class="icon-button" id="studio-photo" aria-label="${text('Photograph marble', 'صوّر البلّية')}" data-tooltip="${text('Photograph marble', 'صوّر البلّية')}"><i data-lucide="camera"></i></button><button class="icon-button" id="studio-fullscreen" aria-label="${text('Full screen', 'ملء الشاشة')}" data-tooltip="${text('Full screen', 'ملء الشاشة')}"><i data-lucide="maximize"></i></button><button class="icon-button" id="studio-settings-toggle" aria-label="${text('Settings', 'الإعدادات')}" aria-expanded="false" data-tooltip="${text('Settings', 'الإعدادات')}"><i data-lucide="settings-2"></i></button></nav></header>
  <section class="studio-caption"><p id="studio-family"></p><h2 id="studio-name"></h2><span id="studio-number"></span></section>
  <div class="studio-controls"><div class="studio-poses" aria-label="${text('Camera poses', 'وضعيات الكاميرا')}">${([
    ['hero', 'focus', 'Hero', 'اللقطة الرئيسية'], ['low', 'arrow-down-to-line', 'Low angle', 'زاوية منخفضة'], ['core', 'scan-eye', 'Inside the glass', 'داخل الزجاج'], ['top', 'grid-2x2', 'Overhead', 'من أعلى'], ['profile', 'move-horizontal', 'Profile', 'جانب البلّية'],
  ] as const).map(([id, icon, english, arabic]) => `<button class="icon-button" data-pose="${id}" aria-label="${text(english, arabic)}" aria-pressed="${id === pose}" data-tooltip="${text(english, arabic)}"><i data-lucide="${icon}"></i></button>`).join('')}</div><div class="studio-control-divider"></div><button class="icon-button" id="showcase" aria-label="${text('Automatic showcase', 'عرض سينمائي')}" aria-pressed="false" data-tooltip="${text('Automatic showcase', 'عرض سينمائي')}"><i data-lucide="play"></i></button><button class="icon-button" id="spin-marble" aria-label="${text('Spin marble', 'تدوير البلّية')}" aria-pressed="false" data-tooltip="${text('Spin marble', 'تدوير البلّية')}"><i data-lucide="rotate-cw"></i></button></div>
  <aside class="studio-catalog"><div class="catalog-heading"><h2>${text('The Collection', 'المجموعة')}</h2><span id="visible-count">100</span></div><div class="studio-filters"><input id="studio-search" type="search" placeholder="${text('Find a marble', 'ابحث عن بلية')}" aria-label="${text('Find a marble', 'ابحث عن بلية')}"><select id="studio-material" aria-label="${text('Material', 'الخامة')}"><option value="">${text('All materials', 'كل الخامات')}</option>${[...new Set(MARBLE_SKINS.map((skin) => skin.family))].map((name) => `<option value="${name}">${isArabic() ? MARBLE_SKINS.find((skin) => skin.family === name)!.familyAr : name}</option>`).join('')}</select></div><div class="studio-grid" id="studio-grid"></div><div class="studio-equip"><span id="studio-unlock"></span><button id="equip-marble"><i data-lucide="gem"></i><span></span></button></div></aside>
  <section class="studio-settings" id="studio-settings" hidden><label>${text('Language', 'اللغة')}<select id="studio-language"><option value="en">English</option><option value="ar">العربية</option></select></label><label>${text('Quality', 'الجودة')}<select id="studio-quality"><option value="balanced">${text('Mobile / balanced', 'متوازنة للهاتف')}</option><option value="high">${text('High', 'عالية')}</option></select></label></section>
  <output class="studio-performance" id="studio-performance"></output><div class="studio-toast" id="studio-toast" role="status" hidden></div><section class="studio-loading" id="studio-loading"><h2>${text('BELY', 'بلي')}</h2><p>${text('Setting the lights', 'نضبط الإضاءة')}</p></section>
`;

function updateIcons() { createIcons({ icons }); }
function notify(message: string) {
  const toast = document.querySelector<HTMLElement>('#studio-toast')!;
  toast.textContent = message;
  toast.hidden = false;
  setTimeout(() => { toast.hidden = true; }, 2200);
}

function renderCatalog() {
  const visible = MARBLE_SKINS.filter((skin) => (!family || skin.family === family) && `${skin.name} ${skin.nameAr} ${skin.family}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  document.querySelector('#visible-count')!.textContent = String(visible.length);
  document.querySelector('#studio-grid')!.innerHTML = visible.map((skin) => `<button class="studio-skin ${skin.id === selected.id ? 'selected' : ''}" data-skin="${skin.id}" aria-pressed="${skin.id === selected.id}" aria-label="${isArabic() ? skin.nameAr : skin.name}"><img loading="lazy" decoding="async" src="${siteUrl(`devlog/04-skin-${skin.id}.webp`)}" width="140" height="140" alt=""><span>${isArabic() ? skin.nameAr : skin.name}</span>${skin.id === progress.equipped ? '<i data-lucide="check"></i>' : !canEquip(progress, skin.id) ? '<i data-lucide="lock-keyhole"></i>' : ''}</button>`).join('');
  updateIcons();
}

function choose(skin: MarbleSkin) {
  selected = skin;
  document.querySelector('#studio-family')!.textContent = isArabic() ? skin.familyAr : skin.family;
  document.querySelector('#studio-name')!.textContent = isArabic() ? skin.nameAr : skin.name;
  document.querySelector('#studio-number')!.textContent = `${String(MARBLE_SKINS.indexOf(skin) + 1).padStart(3, '0')} / 100`;
  const unlocked = canEquip(progress, skin.id);
  const equip = document.querySelector<HTMLButtonElement>('#equip-marble')!;
  equip.disabled = !unlocked || skin.id === progress.equipped;
  equip.querySelector('span')!.textContent = skin.id === progress.equipped ? text('Equipped', 'مُختارة') : text('Equip', 'اختر');
  document.querySelector('#studio-unlock')!.textContent = unlocked ? text('In your collection', 'في مجموعتك') : skin.requires ? text('Win the final to unlock', 'افتحها بالفوز بالنهائي') : text(`${skin.stars} medals to unlock`, `${skin.stars} ميدالية لفتحها`);
  environment?.marbles.setSkin(skin.color, skin.style, skin.finish, skin.secondary);
  const url = new URL(location.href);
  url.searchParams.set('skin', skin.id);
  history.replaceState(null, '', url);
  document.querySelectorAll<HTMLButtonElement>('[data-skin]').forEach((button) => {
    button.classList.toggle('selected', button.dataset.skin === skin.id);
    button.setAttribute('aria-pressed', String(button.dataset.skin === skin.id));
  });
}

function createStudio(container: HTMLElement) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: mobile ? 'default' : 'high-performance', preserveDrawingBuffer: true });
  renderer.setPixelRatio(quality === 'balanced' ? 1 : Math.min(devicePixelRatio, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.append(renderer.domElement);
  renderer.domElement.setAttribute('aria-label', text('Interactive marble studio', 'استوديو بلي تفاعلي'));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x25282b);
  scene.fog = new THREE.Fog(0x25282b, 4, 13);
  const camera = new THREE.PerspectiveCamera(32, 1, 0.015, 50);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.085;
  controls.enablePan = false;
  controls.minDistance = 0.92;
  controls.maxDistance = 5;
  controls.minPolarAngle = 0.06;
  controls.maxPolarAngle = Math.PI / 2 - 0.018;
  controls.rotateSpeed = 0.48;
  controls.zoomSpeed = 0.6;
  controls.target.set(0, 0.36, 0);
  const studioRoom = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environmentMap = pmrem.fromScene(studioRoom, 0.035);
  scene.environment = environmentMap.texture;
  scene.environmentIntensity = 0.75;
  studioRoom.dispose();
  pmrem.dispose();
  const sun = new THREE.DirectionalLight(0xf2f1ed, 3.1);
  sun.position.set(-2.5, 5, 2.5);
  sun.castShadow = true;
  sun.shadow.mapSize.setScalar(mobile ? 512 : 1024);
  sun.shadow.camera.left = -2;
  sun.shadow.camera.right = 2;
  sun.shadow.camera.top = 2;
  sun.shadow.camera.bottom = -2;
  sun.shadow.normalBias = 0.008;
  scene.add(sun, sun.target, new THREE.HemisphereLight(0xe4edf3, 0x687078, 0.85));

  function texture(red: number, green: number, blue: number, color = false) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const context = canvas.getContext('2d')!;
    context.fillStyle = `rgb(${red},${green},${blue})`;
    context.fillRect(0, 0, 64, 64);
    const image = new THREE.CanvasTexture(canvas);
    image.wrapS = image.wrapT = THREE.RepeatWrapping;
    if (color) image.colorSpace = THREE.SRGBColorSpace;
    return image;
  }
  const ground = texture(98, 101, 106, true);
  const normal = texture(128, 128, 255);
  const marbles = createGlassMarbles({ ground, normal });
  marbles.setLayout([{ position: [0, 0.36, 0], radius: 0.36, color: selected.color }]);
  marbles.uniforms.uRingRadius.value = 1000;
  marbles.uniforms.uVolumeSamples.value = mobile ? 24 : 48;
  marbles.uniforms.uSunDirection.value.copy(sun.position).normalize();
  marbles.uniforms.uSunColor.value.copy(sun.color);
  marbles.uniforms.uSunIntensity.value = sun.intensity;
  marbles.uniforms.uSkyFill.value.setRGB(0.46, 0.49, 0.53);
  marbles.uniforms.uGroundTint.value.setRGB(0.84, 0.86, 0.88);
  marbles.uniforms.uCaustics.value = 0.65;
  const material = new THREE.MeshStandardMaterial({ color: 0xcbd0d6, map: ground, roughness: 0.44, metalness: 0.06 });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, marbles.uniforms);
    shader.vertexShader = `varying vec3 vGroundPosition;\n${shader.vertexShader}`.replace('#include <begin_vertex>', '#include <begin_vertex>\nvGroundPosition = (modelMatrix * vec4(position, 1.0)).xyz;');
    shader.fragmentShader = `varying vec3 vGroundPosition;\n${groundDeclarations}\n${shader.fragmentShader}`.replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = groundDetails(diffuseColor.rgb, vGroundPosition);');
  };
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(70, 70), material);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const softboxes = new THREE.Group();
  const lightMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.1, 3.1, 3.0), toneMapped: false, side: THREE.DoubleSide });
  for (const [width, height, position] of [[1.4, 3.5, [-2.6, 2.1, 0.4]], [0.5, 2.8, [2.3, 1.8, 0]], [2.7, 0.9, [0, 3.1, -0.8]]] as [number, number, number[]][]) {
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(width, height), lightMaterial);
    panel.position.fromArray(position);
    panel.lookAt(0, 0.4, 0);
    softboxes.add(panel);
  }
  scene.add(softboxes);
  const renderType = renderer.extensions.has('EXT_color_buffer_float') ? THREE.HalfFloatType : THREE.UnsignedByteType;
  const cubeTarget = new THREE.WebGLCubeRenderTarget(mobile ? 256 : 512, { type: renderType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
  const cubeCamera = new THREE.CubeCamera(0.02, 40, cubeTarget);
  cubeCamera.position.set(0, 0.36, 0);
  const toneMapping = renderer.toneMapping;
  renderer.toneMapping = THREE.NoToneMapping;
  cubeCamera.update(renderer, scene);
  renderer.toneMapping = toneMapping;
  softboxes.visible = false;
  marbles.uniforms.uEnvironment.value = cubeTarget.texture;
  marbles.uniforms.uShadowMap.value = sun.shadow.map?.texture ?? null;
  marbles.uniforms.uShadowMatrix.value.copy(sun.shadow.matrix);
  scene.add(marbles.group);
  const posePositions: Record<Pose, THREE.Vector3> = {
    hero: new THREE.Vector3(1.2, 0.95, 1.72), low: new THREE.Vector3(1.68, 0.46, 1.50), core: new THREE.Vector3(0.12, 0.53, 1.66), top: new THREE.Vector3(0.20, 2.30, 0.30), profile: new THREE.Vector3(-2.04, 0.69, 0.39),
  };
  let transition: { start: THREE.Vector3; target: THREE.Vector3; time: number } | undefined;
  let cycle = 0;
  let frameTime = 0;
  let frames = 0;
  let fps = 0;
  const poseOrder: Pose[] = ['hero', 'low', 'profile', 'core', 'top'];

  function setPose(next: Pose, animate = true) {
    pose = next;
    const target = posePositions[next].clone();
    const subject = new THREE.Vector3(0, 0.36, 0);
    if (container.clientWidth / container.clientHeight < 0.82) target.sub(subject).multiplyScalar(1.4).add(subject);
    controls.target.copy(subject);
    if (animate) transition = { start: camera.position.clone(), target, time: 0 };
    else { transition = undefined; camera.position.copy(target); }
    document.querySelectorAll<HTMLElement>('[data-pose]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.pose === pose)));
    controls.update();
    camera.updateMatrixWorld(true);
  }
  function resize() {
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    setPose(pose, false);
  }
  new ResizeObserver(resize).observe(container);
  resize();
  setPose('hero', false);
  renderer.domElement.addEventListener('pointerdown', () => { showcase = false; transition = undefined; document.querySelector('#showcase')!.setAttribute('aria-pressed', 'false'); });
  function render(delta: number) {
    if (transition) {
      transition.time += delta;
      const amount = Math.min(1, transition.time / 1.35);
      const eased = amount < 0.5 ? 4 * amount ** 3 : 1 - (-2 * amount + 2) ** 3 / 2;
      camera.position.lerpVectors(transition.start, transition.target, eased);
      if (amount >= 1) transition = undefined;
    }
    if (showcase) {
      cycle += delta;
      if (cycle > 6.5) { cycle = 0; setPose(poseOrder[(poseOrder.indexOf(pose) + 1) % poseOrder.length]); }
    }
    if (spinning) marbles.meshes[0].rotateY(delta * 0.22);
    controls.update();
    marbles.sync();
    renderer.render(scene, camera);
    if (delta > 0) {
      frames++;
      frameTime += delta;
      if (frameTime > 0.8) { fps = Math.round(frames / frameTime); frames = 0; frameTime = 0; document.querySelector('#studio-performance')!.textContent = `${fps} FPS`; }
    }
  }
  return { renderer, camera, marbles, setPose, render, resize, state: () => ({ skin: selected.id, pose, showcase, spinning, fps, pixelRatio: renderer.getPixelRatio(), width: renderer.domElement.width, height: renderer.domElement.height, camera: camera.position.toArray(), studioOnly: true }) };
}

renderCatalog();
choose(selected);
if (embedded) {
  const back = document.querySelector<HTMLAnchorElement>('#back-to-game')!;
  back.addEventListener('click', (event) => { event.preventDefault(); parent.postMessage({ type: 'bely-showroom-close' }, location.origin); });
  document.querySelector<HTMLAnchorElement>('a[href*="devlog.html"]')!.target = '_blank';
  document.querySelector<HTMLAnchorElement>('a[href*="devlog.html"]')!.rel = 'noopener';
  addEventListener('keydown', (event) => { if (event.key === 'Escape') parent.postMessage({ type: 'bely-showroom-close' }, location.origin); });
}
document.querySelector<HTMLSelectElement>('#studio-language')!.value = language();
document.querySelector<HTMLSelectElement>('#studio-quality')!.value = quality;
document.querySelector('#studio-grid')!.addEventListener('click', (event) => {
  const button = (event.target as Element).closest<HTMLElement>('[data-skin]');
  const skin = MARBLE_SKINS.find((item) => item.id === button?.dataset.skin);
  if (skin) choose(skin);
});
document.querySelector('#studio-search')!.addEventListener('input', (event) => { search = (event.target as HTMLInputElement).value; renderCatalog(); });
document.querySelector('#studio-material')!.addEventListener('change', (event) => { family = (event.target as HTMLSelectElement).value; renderCatalog(); });
document.querySelectorAll<HTMLElement>('[data-pose]').forEach((button) => button.addEventListener('click', () => { showcase = false; environment?.setPose(button.dataset.pose as Pose); document.querySelector('#showcase')!.setAttribute('aria-pressed', 'false'); }));
document.querySelector('#showcase')!.addEventListener('click', () => {
  showcase = !showcase;
  const button = document.querySelector('#showcase')!;
  button.setAttribute('aria-pressed', String(showcase));
  button.innerHTML = `<i data-lucide="${showcase ? 'pause' : 'play'}"></i>`;
  updateIcons();
});
document.querySelector('#spin-marble')!.addEventListener('click', () => { spinning = !spinning; document.querySelector('#spin-marble')!.setAttribute('aria-pressed', String(spinning)); });
document.querySelector('#studio-settings-toggle')!.addEventListener('click', () => {
  const panel = document.querySelector<HTMLElement>('#studio-settings')!;
  panel.hidden = !panel.hidden;
  document.querySelector('#studio-settings-toggle')!.setAttribute('aria-expanded', String(!panel.hidden));
});
document.querySelector('#studio-language')!.addEventListener('change', async (event) => { await setLanguage((event.target as HTMLSelectElement).value as Language); location.reload(); });
document.querySelector('#studio-quality')!.addEventListener('change', (event) => {
  quality = (event.target as HTMLSelectElement).value;
  environment?.renderer.setPixelRatio(quality === 'balanced' ? 1 : Math.min(devicePixelRatio, 1.5));
  environment?.resize();
});
document.querySelector('#equip-marble')!.addEventListener('click', () => {
  if (!canEquip(progress, selected.id)) return;
  progress.equipped = selected.id;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(progress)); notify(text('Marble equipped', 'تم اختيار البلّية')); } catch { notify(text('Storage is unavailable', 'التخزين غير متاح')); }
  renderCatalog();
  choose(selected);
});
document.querySelector('#studio-photo')!.addEventListener('click', () => {
  environment?.render(0);
  environment?.renderer.domElement.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `bely-${selected.id}-${pose}.png`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
});
document.querySelector('#studio-fullscreen')!.addEventListener('click', async () => {
  try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch { notify(text('Full screen is unavailable', 'ملء الشاشة غير متاح')); }
});

try {
  environment = createStudio(document.querySelector('#studio')!);
  choose(selected);
  document.querySelector<HTMLElement>('#studio-loading')!.hidden = true;
  Object.assign(window, { __showroom: {
    ready: true, state: environment.state,
    select: (id: string) => { const skin = MARBLE_SKINS.find((item) => item.id === id); if (skin) choose(skin); },
    pose: (next: Pose, animate = true) => environment?.setPose(next, animate),
    motion: (enabled: boolean) => { showcase = enabled; spinning = enabled; },
    pixels: () => {
      environment!.render(0);
      const context = environment!.renderer.getContext();
      const data = new Uint8Array(context.drawingBufferWidth * context.drawingBufferHeight * 4);
      context.readPixels(0, 0, context.drawingBufferWidth, context.drawingBufferHeight, context.RGBA, context.UNSIGNED_BYTE, data);
      let sum = 0;
      let hash = 2166136261;
      for (let index = 0; index < data.length; index += 4) { sum += data[index] + data[index + 1] + data[index + 2]; hash = Math.imul(hash ^ data[index], 16777619) >>> 0; }
      return { hash, brightness: sum / (data.length / 4 * 3), width: context.drawingBufferWidth, height: context.drawingBufferHeight };
    },
  } });
  let previous = performance.now();
  function frame(now: number) {
    const delta = Math.min(0.1, (now - previous) / 1000);
    previous = now;
    if (!document.hidden) environment!.render(delta);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  addEventListener('pagehide', () => { environment?.renderer.dispose(); environment?.renderer.forceContextLoss(); });
} catch (error) {
  console.error(error);
  document.querySelector('#studio-loading')!.innerHTML = `<img src="${siteUrl(`devlog/04-skin-${selected.id}.webp`)}" width="280" height="280" alt="${selected.name}"><p>${text('3D rendering is unavailable on this browser. The collection is still available.', 'العرض ثلاثي الأبعاد غير متاح في هذا المتصفح. يمكنك تصفح المجموعة.')}</p>`;
}