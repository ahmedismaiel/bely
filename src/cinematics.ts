import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { LEVELS, arenaById } from './levels';
import type { Level } from './levels';
import { bilingual as text, isArabic, t } from './locale';
import type { Game } from './game';
import type { Street, View } from './scene';
import { siteUrl } from './urls';

const stories = {
  nour: { name: 'Mariam', title: ['An old tin. A new journey.', 'علبة قديمة. وحكاية جديدة.'], color: 0xb76354, female: true, gesture: 'PickUp_Table', lines: [
    ['Nour', "Dad kept this tin on the roof. Every marble came from a different friend.", 'بابا كان سايب العلبة دي فوق السطح. كل بلية فيها من صاحب مختلف.'],
    ['Mariam', "Then let us bring them together again. Before I leave for college, one last neighborhood final.", 'طب نجمعهم تاني. قبل ما أسافر للجامعة، نعمل آخر بطولة للحارة.'],
    ['Mariam', "Start here, Nour. Then find me on Al-Muizz Street. The old circle is waiting.", 'ابدأ من هنا يا نور. وبعدين قابلني في المعز. الدايرة القديمة مستنيانا.'],
  ] },
  workshop: { name: 'Mariam', title: ['The angle nobody sees', 'الزاوية اللي محدش شايفها'], color: 0xb76354, female: true, gesture: 'Fixing_Kneeling', lines: [
    ['Mariam', "This is where we learned the rail shot. You always tried the impossible angle.", 'هنا اتعلمنا الرمية المرتدة. وإنت دايمًا كنت بتجرب الزاوية المستحيلة.'],
    ['Nour', "I remember the arguments more than the scores.", 'أنا فاكر الخناقات أكتر من النتيجة.'],
    ['Mariam', "Good. Win this one and take the invitation up to the Citadel. Karim is waiting.", 'حلو. اكسب الجولة وخد الدعوة للقلعة. كريم مستنيك.'],
  ] },
  courtyard: { name: 'Karim', title: ['The city beneath our feet', 'المدينة تحت رجلينا'], color: 0x567884, female: false, gesture: 'Interact', lines: [
    ['Karim', "From up here, every street looks close. We used to think we could cross Cairo in one afternoon.", 'من هنا كل الشوارع شكلها قريب. زمان كنا فاكرين نلف القاهرة كلها في يوم.'],
    ['Nour', "There is a final tonight. Everyone gets an invitation. Even the quiet champion.", 'في نهائي الليلة. والكل معزوم. حتى البطل الهادي.'],
    ['Karim', "Then earn your way through the small pocket. Salma is by the sea after that.", 'يبقى عدّي من الحفرة الصغيرة. وبعدها سلمى مستنياك على البحر.'],
  ] },
  alexandria: { name: 'Salma', title: ['Where the street meets the sea', 'لما الشارع يقابل البحر'], color: 0x438b94, female: true, gesture: 'Idle_Talking_Loop', lines: [
    ['Salma', "You brought Cairo all the way to my beach? I thought you had forgotten us.", 'جبت القاهرة لحد الشط عندي؟ كنت فاكرة إنك نسيتنا.'],
    ['Nour', "Not a chance. Mariam is leaving. We are getting the old circle back together.", 'مستحيل. مريم مسافرة. وإحنا بنجمع الدايرة القديمة تاني.'],
    ['Salma', "One match, then I will come. Watch the water. It steals more speed than you think.", 'ماتش واحد وأنا جاية. خلي بالك من المية. بتسحب السرعة أكتر ما تتخيل.'],
  ] },
  delta: { name: 'Omar', title: ['The long way home', 'الطريق الطويل للبيت'], color: 0x718259, female: false, gesture: 'PickUp_Table', lines: [
    ['Omar', "I found this one by the river. Green glass, like the one you lost years ago.", 'لقيت دي جنب النيل. خضرا، زي اللي ضاعت منك زمان.'],
    ['Nour', "Keep it for the final. There is room in the tin for every one of us.", 'خليها للنهائي. العلبة فيها مكان لينا كلنا.'],
    ['Omar', "Then show me you still know how to read soft ground. We leave together after this.", 'ورّيني إنك لسه فاهم الأرض الناعمة. وبعد الجولة نمشي سوا.'],
  ] },
  festival: { name: 'Youssef', title: ['One circle. All of us.', 'دايرة واحدة. وكلنا فيها.'], color: 0x795d80, female: false, gesture: 'Idle_Talking_Loop', lines: [
    ['Youssef', "You actually brought everyone back. Even Salma made the trip.", 'إنت فعلًا رجّعت الكل. حتى سلمى جت من إسكندرية.'],
    ['Nour', "The tin was never about owning every marble. It was about remembering who gave them to us.", 'العلبة عمرها ما كانت عشان نجمع كل البلي. كانت عشان نفتكر مين ادّاهولنا.'],
    ['Youssef', "Then one last match before the lanterns go out. Your first shot, Nour.", 'يبقى آخر ماتش قبل الفوانيس ما تطفي. أول رمية ليك يا نور.'],
  ] },
};

export function createCinematics(stage: Street, game: Game, refreshIcons: () => void) {
  const root = new THREE.Group();
  root.name = 'Animated cinematic cast';
  root.visible = false;
  stage.scene.add(root);
  const overlay = document.createElement('section');
  overlay.id = 'cinematic';
  overlay.className = 'cinematic';
  overlay.hidden = true;
  overlay.innerHTML = `<div class="cinema-top"><div><p id="cinema-chapter"></p><h2 id="cinema-title"></h2></div><button id="skip-cinema"><i data-lucide="skip-forward"></i><span>${t('Skip scene')}</span></button></div><div class="cinema-dialogue"><p class="cinema-speaker" id="cinema-speaker"></p><p id="cinema-line" dir="auto"></p><div class="cinema-bottom"><span id="cinema-counter"></span><button id="cinema-next">${t('Continue')}<i data-lucide="arrow-right"></i></button></div></div><div class="cinema-progress"><span id="cinema-progress"></span></div>`;
  document.body.append(overlay);
  let assetPromise: Promise<void> | undefined;
  let actors: { root: THREE.Group; mixer: THREE.AnimationMixer; actions: Record<string, THREE.AnimationAction>; female: boolean; current: string; source: string }[] = [];
  let active = false;
  let loading = false;
  let time = 0;
  let lineIndex = -1;
  let currentLevel = LEVELS[0];
  let ticket = 0;
  let voice = false;
  const cinematicSetting = new URLSearchParams(location.search).get('cinematics');
  let skipAll = cinematicSetting === '0' || cinematicSetting !== '1' && stage.getState().mobileProfile;
  let motionEnabled = true;
  const saved = { position: new THREE.Vector3(), target: new THREE.Vector3(), fov: 45, damping: true, view: 'street' as View };
  const shotStart = new THREE.Vector3();
  const shotEnd = new THREE.Vector3();
  const shotTarget = new THREE.Vector3();

  async function loadCast() {
    const base = 'assets/realistic-cast/';
    const response = await fetch(siteUrl(`${base}manifest.json`));
    if (!response.ok) throw new Error('The realistic cast manifest is unavailable');
    const manifest = await response.json() as { avatars: { id: string; model: string; textures: string[] }[]; animations: Record<string, string>; files: { path: string }[] };
    const placeholder = document.createElement('canvas');
    placeholder.width = placeholder.height = 1;
    const context = placeholder.getContext('2d')!;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, 1, 1);
    const whitePixel = placeholder.toDataURL();
    const textureFiles = new Map(manifest.files.filter((file) => file.path.endsWith('.webp')).map((file) => [file.path.split('/').at(-1)!.toLowerCase(), file.path]));
    const manager = new THREE.LoadingManager();
    manager.setURLModifier((url) => {
      if (url.startsWith('data:') || url.startsWith('blob:')) return url;
      if (/\.(tga|png|jpg|webp)$/i.test(url)) {
        const basename = decodeURIComponent(url).split(/[\\/]/).at(-1)!.replace(/\.tga$/i, '.webp').toLowerCase();
        const resolved = textureFiles.get(basename);
        return resolved ? siteUrl(base + resolved) : whitePixel;
      }
      return url;
    });
    const loader = new FBXLoader(manager);
    const models = await Promise.all(manifest.avatars.map((avatar) => loader.loadAsync(siteUrl(base + avatar.model))));
    const animationManager = new THREE.LoadingManager();
    animationManager.setURLModifier((url) => /\.(tga|png|jpg|webp)$/i.test(url) ? whitePixel : url);
    const animationLoader = new FBXLoader(animationManager);
    const animationSources = Object.fromEntries(await Promise.all(Object.entries(manifest.animations).map(async ([name, file]) => [name, await animationLoader.loadAsync(siteUrl(base + file))])));
    const canonical = (name: string) => name.toLowerCase().replace(/^.*?bip\d*[_ ]?/, '').replace(/[^a-z]/g, '');
    for (const modelIndex of [2, 0, 1]) {
      const isFemale = modelIndex === 0;
      const character = clone(models[modelIndex]);
      const holder = new THREE.Group();
      holder.add(character);
      character.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        if (/midpoly|ultralowpoly|lowpoly/i.test(object.name) && !/hipoly/i.test(object.name)) { object.visible = false; return; }
        object.castShadow = true;
        object.receiveShadow = true;
        const convertMaterial = (source: THREE.Material) => {
          const previous = source as THREE.MeshPhongMaterial;
          const cutout = /opacity|hair|lash/i.test(source.name) || previous.transparent;
          const surface = new THREE.MeshStandardMaterial({ name: source.name, color: 0xffffff, map: previous.map, normalMap: previous.normalMap, roughness: 0.82, metalness: 0, alphaTest: cutout ? 0.42 : 0, side: cutout ? THREE.DoubleSide : THREE.FrontSide });
          if (surface.map) { surface.map.colorSpace = THREE.SRGBColorSpace; surface.map.anisotropy = 4; }
          if (surface.normalMap) surface.normalMap.colorSpace = THREE.NoColorSpace;
          return surface;
        };
        object.material = Array.isArray(object.material) ? object.material.map(convertMaterial) : convertMaterial(object.material);
      });
      const bounds = new THREE.Box3().setFromObject(character);
      const size = bounds.getSize(new THREE.Vector3());
      character.scale.multiplyScalar((isFemale ? 1.65 : 1.74) / size.y);
      character.updateMatrixWorld(true);
      const scaled = new THREE.Box3().setFromObject(character);
      character.position.y -= scaled.min.y;
      const bones = new Map<string, THREE.Bone>();
      character.traverse((object) => { if (object instanceof THREE.Bone) bones.set(canonical(object.name), object); });
      const mixer = new THREE.AnimationMixer(character);
      const actions: Record<string, THREE.AnimationAction> = {};
      for (const [name, sourceName] of Object.entries({ Idle_Loop: 'idle', Walk_Loop: 'walk', Idle_Talking_Loop: 'talk', Fixing_Kneeling: 'talk', PickUp_Table: 'talk', Interact: 'talk', Crouch_Idle_Loop: 'idle' })) {
        const source = animationSources[sourceName].animations[0];
        if (!source) throw new Error(`Missing native animation ${sourceName}`);
        const tracks: THREE.KeyframeTrack[] = [];
        for (const track of source.tracks) {
          const separator = track.name.lastIndexOf('.');
          const boneName = track.name.slice(0, separator);
          const property = track.name.slice(separator + 1);
          const bone = bones.get(canonical(boneName));
          if (!bone || property !== 'quaternion') continue;
          const converted = track.clone();
          converted.name = `${bone.name}.quaternion`;
          tracks.push(converted);
        }
        if (tracks.length < 10) throw new Error(`Native rig binding failed: ${tracks.length} tracks for ${manifest.avatars[modelIndex].id}`);
        actions[name] = mixer.clipAction(new THREE.AnimationClip(name, source.duration, tracks));
      }
      holder.visible = false;
      root.add(holder);
      actors.push({ root: holder, mixer, actions, female: isFemale, current: '', source: manifest.avatars[modelIndex].id });
    }
  }

  function act(actor: typeof actors[number], name: string) {
    if (actor.current === name) return;
    const next = actor.actions[name] ?? actor.actions.Idle_Loop;
    if (!next) return;
    const previous = actor.actions[actor.current];
    next.reset().setEffectiveWeight(1).play();
    if (previous) next.crossFadeFrom(previous, 0.28, true);
    actor.current = name;
  }

  function narrate(line: string) {
    if (!voice || !('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(line);
    utterance.lang = isArabic() ? 'ar-EG' : 'en-GB';
    utterance.rate = 0.94;
    const available = speechSynthesis.getVoices().find((candidate) => candidate.lang.startsWith(isArabic() ? 'ar' : 'en'));
    if (available) utterance.voice = available;
    speechSynthesis.speak(utterance);
  }

  function showLine(index: number) {
    const story = stories[currentLevel.arena];
    const line = story.lines[index];
    if (!line) return;
    lineIndex = index;
    overlay.querySelector('#cinema-speaker')!.textContent = t(line[0]);
    overlay.querySelector('#cinema-line')!.textContent = text(line[1], line[2]);
    overlay.querySelector('#cinema-counter')!.textContent = `${index + 1} / ${story.lines.length}`;
    overlay.querySelector('#cinema-next')!.innerHTML = `${t(index === story.lines.length - 1 ? 'Begin match' : 'Continue')}<i data-lucide="arrow-right"></i>`;
    narrate(text(line[1], line[2]));
    refreshIcons();
  }

  function skip() {
    ticket++;
    if (!active) return;
    active = false;
    root.visible = false;
    overlay.hidden = true;
    document.body.classList.remove('in-cinematic');
    stage.controls.update();
    stage.setView(saved.view);
    stage.camera.position.copy(saved.position);
    stage.controls.target.copy(saved.target);
    stage.camera.fov = saved.fov;
    stage.camera.updateProjectionMatrix();
    stage.controls.enabled = true;
    stage.controls.enableDamping = saved.damping;
    stage.controls.update();
    game.setPaused(false);
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  }

  async function play(level: Level) {
    if (skipAll) return;
    skip();
    currentLevel = level;
    const request = ++ticket;
    active = true;
    loading = true;
    game.setPaused(true);
    stage.setTour(false);
    saved.position.copy(stage.camera.position);
    saved.target.copy(stage.controls.target);
    saved.fov = stage.camera.fov;
    saved.view = stage.getState().view;
    saved.damping = stage.controls.enableDamping;
    stage.controls.enableDamping = false;
    stage.controls.enabled = false;
    const arena = arenaById(level.arena);
    const story = stories[level.arena];
    overlay.hidden = false;
    document.body.classList.add('in-cinematic');
    overlay.querySelector('#cinema-chapter')!.textContent = `${t('Chapter {{chapter}}', { chapter: arena.chapter })} / ${t(arena.name)}`;
    overlay.querySelector('#cinema-title')!.textContent = text(story.title[0], story.title[1]);
    overlay.querySelector('#skip-cinema span')!.textContent = t('Skip scene');
    overlay.querySelector('#cinema-speaker')!.textContent = t('You are Nour');
    overlay.querySelector('#cinema-line')!.textContent = t('Preparing your journey');
    assetPromise ??= loadCast();
    try { await assetPromise; } catch (error) { console.error('Cinematic cast failed to load', error); skip(); return; }
    if (request !== ticket) return;
    loading = false;
    time = 0;
    lineIndex = -1;
    actors.forEach((actor) => { actor.root.visible = false; });
    const friend = actors[story.female ? 1 : 0];
    const nour = actors[2];
    friend.root.visible = true;
    nour.root.visible = true;
    friend.root.position.set(-0.56, 0, -1.6);
    friend.root.rotation.y = 0.35;
    nour.root.position.set(0.92, 0, -0.92);
    nour.root.rotation.y = -2.3;
    act(friend, 'Walk_Loop');
    act(nour, 'Idle_Loop');
    root.visible = true;
    stage.setView('vista');
    stage.controls.enabled = false;
    shotStart.copy(stage.camera.position);
    shotEnd.copy(shotStart).add(new THREE.Vector3(-0.55, 0.1, -0.45));
    shotTarget.copy(stage.controls.target);
    showLine(0);
  }

  function tick(delta: number) {
    if (!active || loading || !motionEnabled) return;
    time += delta;
    const story = stories[currentLevel.arena];
    const friend = actors[story.female ? 1 : 0];
    const nour = actors[2];
    friend.mixer.update(delta);
    nour.mixer.update(delta);
    if (time < 8) {
      const amount = THREE.MathUtils.smoothstep(time, 0, 8);
      stage.camera.position.copy(shotStart).lerp(shotEnd, amount);
      stage.controls.target.copy(shotTarget);
      friend.root.position.z = -1.6 + Math.min(1, time / 3.8) * 1.08;
    } else if (time < 14) {
      if (lineIndex < 1) showLine(1);
      act(friend, 'Idle_Talking_Loop');
      stage.camera.position.lerp(new THREE.Vector3(0.12, 1.18, 2.15), Math.min(1, delta * 3.3));
      stage.controls.target.lerp(new THREE.Vector3(-0.22, 1.12, -0.43), Math.min(1, delta * 3.8));
      stage.camera.fov = THREE.MathUtils.lerp(stage.camera.fov, 44, Math.min(1, delta * 2));
    } else if (time < 21) {
      if (lineIndex < 2) showLine(2);
      act(friend, story.gesture);
      stage.camera.position.lerp(new THREE.Vector3(0.17, 0.86, 1.65), Math.min(1, delta * 2.5));
      stage.controls.target.lerp(new THREE.Vector3(-0.23, 0.83, -0.32), Math.min(1, delta * 2.7));
    } else {
      stage.camera.position.lerp(saved.position, Math.min(1, delta * 3));
      stage.controls.target.lerp(saved.target, Math.min(1, delta * 3));
      if (time > 23) skip();
    }
    stage.camera.updateProjectionMatrix();
    (overlay.querySelector('#cinema-progress') as HTMLElement).style.width = `${Math.min(100, time / 23 * 100)}%`;
  }

  overlay.querySelector('#skip-cinema')!.addEventListener('click', skip);
  overlay.querySelector('#cinema-next')!.addEventListener('click', () => {
    if (lineIndex === 0) time = 8.01;
    else if (lineIndex === 1) time = 14.01;
    else skip();
  });
  window.addEventListener('bely-enter-level', (event) => {
    const detail = (event as CustomEvent<{ id: string; preview: boolean }>).detail;
    if (detail.preview) { skip(); return; }
    const level = LEVELS.find((item) => item.id === detail.id);
    if (level) void play(level);
  });
  window.addEventListener('bely-modal-open', skip);
  window.addEventListener('bely-language', () => { if (active && lineIndex >= 0) showLine(lineIndex); });
  window.addEventListener('keydown', (event) => { if (active && event.code === 'Escape') { event.preventDefault(); skip(); } });
  return { play, skip, tick, replay: () => { skipAll = false; return play(currentLevel); }, setVoice(enabled: boolean) { voice = enabled; }, setSkipAll(enabled: boolean) { skipAll = enabled; if (enabled) skip(); }, freeze(frozen: boolean) { motionEnabled = !frozen; }, state: () => ({ active, loading, time, line: lineIndex, level: currentLevel.id, skipAll, castLoaded: actors.length > 0, castSource: 'Microsoft Rocketbox / MIT', avatars: actors.map((actor) => actor.source), clips: actors[0] ? Object.keys(actors[0].actions) : [] }) };
}