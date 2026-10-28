import { Vector3 } from 'three';
import { ARENAS, LEVELS, SKINS, arenaById, dailyLevel, levelById, medalFor } from './levels';
import type { ArenaId, Level } from './levels';
import { SAVE_KEY, canEquip, canPlay, nextLevel, parseProgress, rank, recordResult, totalStars } from './progression';
import type { Game, GameState } from './game';
import type { Street, View } from './scene';
import { isArabic, t, translateStatic } from './locale';
import { pageUrl, siteUrl } from './urls';

const ruleNames = { knockout: 'Circle knockout', bank: 'Bank shot', pocket: 'Pocket play', duel: 'Street rival' };
const ruleIcons = { knockout: 'crosshair', bank: 'corner-up-right', pocket: 'circle-dot', duel: 'swords' };
const starIcons = (count: number) => Array.from({ length: 3 }, (_, index) => `<i data-lucide="star" class="${index < count ? 'earned' : ''}"></i>`).join('');

export function createJourney(game: Game, stage: Street, refreshIcons: () => void, toast: (message: string) => void) {
  let serialized: string | null = null;
  try { serialized = localStorage.getItem(SAVE_KEY); } catch { serialized = null; }
  let progress = parseProgress(serialized);
  let debugUnlocked = new URLSearchParams(location.search).get('debug') === '1';
  try { debugUnlocked ||= sessionStorage.getItem('bely-debug-unlock') === '1'; } catch { debugUnlocked = new URLSearchParams(location.search).get('debug') === '1'; }
  let current = levelById(progress.lastLevel) ?? LEVELS[0];
  let selectedArena: ArenaId = current.arena;
  let selectedSkin = progress.equipped;
  let materialFilter = '';
  let marbleSearch = '';
  let tab = 'journey';
  let dailyKey: string | undefined;
  let previewing = false;
  let recorded = false;
  let returnView: View = 'street';
  let earnedRewards: string[] = [];
  let unlockedArenas: string[] = [];
  let travelTimer: ReturnType<typeof setTimeout>;
  const playable = (level: Level) => debugUnlocked || canPlay(progress, level);
  const showroom = document.createElement('dialog');
  showroom.className = 'showroom-overlay';
  showroom.id = 'showroom-overlay';
  showroom.setAttribute('aria-label', t('Marble tin'));
  document.body.append(showroom);
  let showroomFrame: HTMLIFrameElement | undefined;
  let pausedBeforeShowroom = false;

  function closeShowroom() {
    if (!showroom.open) return;
    showroom.close();
    showroom.replaceChildren();
    showroomFrame = undefined;
    document.body.classList.remove('showroom-open');
    try { progress = parseProgress(localStorage.getItem(SAVE_KEY)); } catch { document.body.dataset.progressStorage = 'unavailable'; }
    applyEquipped();
    profile();
    game.setPaused(pausedBeforeShowroom);
    if (dialog.open) render();
  }
  showroom.addEventListener('cancel', (event) => { event.preventDefault(); closeShowroom(); });
  window.addEventListener('message', (event) => {
    if (event.origin !== location.origin || event.source !== showroomFrame?.contentWindow) return;
    if (event.data?.type === 'bely-showroom-close') closeShowroom();
  });

  const dialog = document.createElement('dialog');
  dialog.id = 'journey-dialog';
  dialog.className = 'journey-dialog';
  dialog.setAttribute('aria-labelledby', 'journey-heading');
  dialog.innerHTML = `
    <header class="journey-header">
      <div class="journey-wordmark"><b data-i18n="BELY">BELY</b><span id="journey-heading" data-i18n="The Neighborhood Circuit">The Neighborhood Circuit</span></div>
      <div class="journey-tabs" role="tablist" aria-label="Journey views">
        <button role="tab" data-tab="journey" aria-selected="true"><i data-lucide="map-pinned"></i><span data-i18n="Journey">Journey</span></button>
        <button role="tab" data-tab="collection" aria-selected="false"><i data-lucide="gem"></i><span data-i18n="Marble tin">Marble tin</span></button>
        <button role="tab" data-tab="daily" aria-selected="false"><i data-lucide="calendar-days"></i><span data-i18n="Daily trial">Daily trial</span></button>
      </div>
      <button class="icon-button" id="close-journey" aria-label="Resume game" title="Resume game"><i data-lucide="x"></i></button>
    </header>
    <div class="journey-layout">
      <aside class="journey-sidebar"><div class="journey-profile"><i data-lucide="award"></i><p class="eyebrow" data-i18n="Your place in the neighborhood">Your place in the neighborhood</p><h2 id="profile-rank"></h2><div class="reputation-line"><span id="profile-reputation"></span><span id="profile-medals"></span></div><progress id="reputation-meter" aria-label="Reputation"></progress></div><nav id="district-list" aria-label="Destinations"></nav><div class="journey-save"><span class="status-dot"></span><span data-i18n="Local journey save">Local journey save</span></div></aside>
      <section id="journey-content" class="journey-content"></section>
    </div>
  `;
  document.body.append(dialog);
  translateStatic(dialog);

  function persist() {
    if (debugUnlocked) { document.querySelector('#save-state')!.textContent = t('Debug session / progress unchanged'); return; }
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(progress));
      document.querySelector('#save-state')!.textContent = t('Progress saved');
    } catch {
      document.querySelector('#save-state')!.textContent = t('Session only');
      toast(t('Browser storage is unavailable. This journey is saved for this session only.'));
    }
  }

  function equippedSkin() { return SKINS.find((skin) => skin.id === progress.equipped) ?? SKINS[0]; }
  function applyEquipped() { const skin = equippedSkin(); game.setSkin(skin.color, skin.style, skin.finish, skin.secondary); }
  function profile() {
    const standing = rank(progress);
    const medals = totalStars(progress);
    document.querySelector('#journey-stars')!.textContent = `${medals} / 36`;
    document.querySelector('#profile-rank')!.textContent = t(standing.name);
    document.querySelector('#profile-reputation')!.textContent = t('{{count}} REP', { count: standing.reputation });
    document.querySelector('#profile-medals')!.textContent = `${medals} / 36`;
    const meter = document.querySelector<HTMLProgressElement>('#reputation-meter')!;
    meter.max = standing.next?.points ?? Math.max(750, standing.reputation);
    meter.value = standing.reputation;
  }

  function goal(level: Level) {
    if (level.rule === 'duel') return t('First to {{count}} marbles', { count: level.target });
    if (level.rule === 'pocket') return level.target === 1 ? t('Pocket one marble') : t('Pocket {{count}} marbles', { count: level.target });
    if (level.rule === 'bank') return t('{{count}} capture after a rail-first shot', { count: level.target });
    return t('Knock {{count}} marbles out of the circle', { count: level.target });
  }

  function lockReason(level: Level) {
    const arena = arenaById(level.arena);
    const missing = arena.unlockStars - totalStars(progress);
    if (missing > 0) return t('{{count}} more medals to open this destination', { count: missing });
    return t('Clear {{name}} first', { name: t(levelById(level.requires ?? '')?.name ?? 'the previous event') });
  }

  function eventCard(level: Level, daily = false) {
    const unlocked = daily || playable(level);
    const result = daily ? progress.daily[dailyLevel().key] : progress.results[level.id];
    return `<article class="event-card ${unlocked ? '' : 'locked'}">
      <div class="event-type"><i data-lucide="${ruleIcons[level.rule]}"></i><span>${t(ruleNames[level.rule])}${level.rule === 'bank' ? ` / ${t('Experimental assist')}` : ''}</span><div class="small-stars">${starIcons(result?.stars ?? 0)}</div></div>
      <h3>${t(level.name)}</h3><p class="event-subtitle">${t(level.subtitle)}</p>
      <div class="event-goal">${goal(level)}</div>
      <div class="event-budget"><span>${t('{{count}} shots', { count: level.shots })}</span><span>${t('Gold in {{count}}', { count: level.gold })}</span>${result ? `<span>${t('Best: {{count}}', { count: result.shots })}</span>` : ''}</div>
      <div class="event-actions"><button class="primary-action" data-start="${level.id}" ${daily ? 'data-daily="true"' : ''} ${unlocked ? '' : 'disabled'}><i data-lucide="${unlocked ? 'play' : 'lock-keyhole'}"></i>${t(unlocked ? result ? 'Play again' : 'Play event' : 'Locked')}</button><button class="icon-button" data-visit="${level.id}" aria-label="${t('Preview {{name}}', { name: t(level.name) })}" title="${t('Preview arena')}"><i data-lucide="eye"></i></button></div>
      ${unlocked ? '' : `<p class="lock-reason">${lockReason(level)}</p>`}
    </article>`;
  }

  function render() {
    profile();
    dialog.classList.toggle('collection-mode', tab === 'collection');
    dialog.querySelectorAll<HTMLElement>('[data-tab]').forEach((button) => {
      button.setAttribute('aria-selected', String(button.dataset.tab === tab));
      button.tabIndex = button.dataset.tab === tab ? 0 : -1;
    });
    const medals = totalStars(progress);
    document.querySelector('#district-list')!.innerHTML = ARENAS.map((arena) => {
      const earned = LEVELS.filter((level) => level.arena === arena.id).reduce((sum, level) => sum + (progress.results[level.id]?.stars ?? 0), 0);
      return `<button class="district-stop ${arena.id === selectedArena ? 'selected' : ''}" data-arena="${arena.id}" aria-pressed="${arena.id === selectedArena}"><span class="stop-number">${arena.chapter}</span><span class="stop-name">${t(arena.name)}<small>${t(arena.location)}</small></span><span class="stop-status">${!debugUnlocked && medals < arena.unlockStars ? '<i data-lucide="lock-keyhole"></i>' : `${earned}<i data-lucide="star"></i>`}</span></button>`;
    }).join('');
    const content = document.querySelector('#journey-content')!;
    if (tab === 'collection') {
      const skin = SKINS.find((item) => item.id === selectedSkin) ?? SKINS[0];
      const unlocked = canEquip(progress, skin.id);
      const earnedCount = SKINS.filter((item) => canEquip(progress, item.id)).length;
      content.innerHTML = `<div class="collection-stage" aria-label="${t('Rotate the marble')}" role="img"></div><aside class="collection-panel"><p class="eyebrow">${t('Your marble tin / {{count}} of {{total}}', { count: earnedCount, total: SKINS.length })}</p><h2>${t(skin.name)}</h2><p class="collection-description">${t(skin.description)}</p><div class="skin-grid">${SKINS.map((item) => `<button class="skin-tile ${item.id === selectedSkin ? 'selected' : ''}" data-skin="${item.id}" aria-label="${t('Inspect {{name}}', { name: t(item.name) })}" aria-pressed="${item.id === selectedSkin}"><img src="/devlog/04-skin-${item.id}.webp" alt="${t(item.name)}" width="240" height="240"><span>${t(item.name)}</span>${canEquip(progress, item.id) ? progress.equipped === item.id ? '<i data-lucide="check" class="skin-state"></i>' : '' : '<i data-lucide="lock-keyhole" class="skin-state"></i>'}</button>`).join('')}</div><button class="primary-action equip-action" id="equip-skin" ${unlocked ? '' : 'disabled'}><i data-lucide="${unlocked ? 'gem' : 'lock-keyhole'}"></i>${progress.equipped === skin.id ? t('Equipped') : unlocked ? t('Equip marble') : skin.requires ? t('Win the neighborhood final') : t('{{count}} medals required', { count: skin.stars })}</button><p class="collection-balance">${t('Same weight. Your own signature.')}</p></aside>`;
      const filterBar = document.createElement('div');
      filterBar.className = 'collection-filters';
      filterBar.innerHTML = `<input type="search" id="marble-search" aria-label="${t('Find a marble')}" placeholder="${t('Find a marble')}"><select id="material-filter" aria-label="${t('Material')}"><option value="">${t('All materials')}</option>${[...new Set(SKINS.map((item) => item.family))].map((family) => `<option value="${family}">${t(family)}</option>`).join('')}</select>`;
      content.querySelector('.skin-grid')!.before(filterBar);
      const search = content.querySelector<HTMLInputElement>('#marble-search')!;
      const filter = content.querySelector<HTMLSelectElement>('#material-filter')!;
      search.value = marbleSearch;
      filter.value = materialFilter;
      function filterMarbles() {
        marbleSearch = search.value;
        materialFilter = filter.value;
        content.querySelectorAll<HTMLElement>('[data-skin]').forEach((card) => {
          const item = SKINS.find((candidate) => candidate.id === card.dataset.skin)!;
          const matchesName = `${item.name} ${item.nameAr} ${item.family}`.toLocaleLowerCase().includes(marbleSearch.toLocaleLowerCase());
          card.hidden = !matchesName || !!materialFilter && item.family !== materialFilter;
        });
      }
      search.addEventListener('input', filterMarbles);
      filter.addEventListener('change', filterMarbles);
      filterMarbles();
      stage.setView('macro');
      const home = current.layout[0].position;
      stage.marbles.meshes[0].position.fromArray(home);
      const width = innerWidth < 650 ? 0 : isArabic() ? -0.16 : 0.16;
      const height = innerWidth < 650 ? -innerHeight * 0.10 : 0;
      stage.camera.setViewOffset(innerWidth, innerHeight, innerWidth * width, height, innerWidth, innerHeight);
      stage.marbles.setSkin(skin.color, skin.style, skin.finish, skin.secondary);
      const surface = content.querySelector<HTMLElement>('.collection-stage')!;
      let dragging = false;
      let previousX = 0;
      surface.addEventListener('pointerdown', (event) => { dragging = true; previousX = event.clientX; surface.setPointerCapture(event.pointerId); });
      surface.addEventListener('pointermove', (event) => {
        if (!dragging) return;
        const angle = (event.clientX - previousX) * -0.009;
        previousX = event.clientX;
        stage.camera.position.sub(stage.controls.target).applyAxisAngle(new Vector3(0, 1, 0), angle).add(stage.controls.target);
        stage.controls.update();
      });
      surface.addEventListener('pointerup', () => { dragging = false; });
      surface.addEventListener('pointercancel', () => { dragging = false; });
    } else if (tab === 'daily') {
      stage.camera.clearViewOffset();
      applyEquipped();
      stage.setView(returnView);
      const daily = dailyLevel();
      const arena = arenaById(daily.level.arena);
      content.innerHTML = `<div class="destination-heading"><div><p class="eyebrow">${t('Daily trial')} / <bdi>${daily.key}</bdi></p><h2>${t('One street. A fresh challenge.')}</h2><p>${t(arena.name)}, ${t(arena.location)}</p></div><i data-lucide="calendar-days" class="section-symbol"></i></div><figure class="destination-photo"><img src="${siteUrl(`devlog/04-${arena.id}.webp`)}" width="960" height="540" alt="${t(arena.name)}"></figure><div class="daily-events">${eventCard(daily.level, true)}<div class="daily-record"><p class="eyebrow">${t("Today's best")}</p><div class="medal-stars">${starIcons(progress.daily[daily.key]?.stars ?? 0)}</div><p>${progress.daily[daily.key] ? t('{{count}} shots', { count: progress.daily[daily.key].shots }) : t('No result yet')}</p><span>${t('Daily results have their own record.')}</span></div></div>`;
    } else {
      stage.camera.clearViewOffset();
      applyEquipped();
      stage.setView(returnView);
      const arena = arenaById(selectedArena);
      content.innerHTML = `<div class="destination-heading"><div><p class="eyebrow">${t('Destination {{chapter}} / {{location}}', { chapter: arena.chapter, location: t(arena.location) })}</p><h2>${t(arena.name)}</h2><p>${t(arena.subtitle)}</p></div><button class="icon-button" data-visit="${LEVELS.find((level) => level.arena === arena.id)!.id}" aria-label="${t('Visit {{name}}', { name: t(arena.name) })}" title="${t('Visit the arena')}"><i data-lucide="scan-eye"></i></button></div><figure class="destination-photo"><img src="${siteUrl(`devlog/04-${arena.id}.webp`)}" width="960" height="540" alt="${t(arena.name)}"><figcaption><span>${t(arena.surface === 'wet' ? 'Wet paving' : arena.surface === 'tile' ? 'Worn tile' : arena.surface === 'concrete' ? 'Patched concrete' : arena.surface === 'sand' ? 'Loose sand' : 'Packed earth')}</span><span>${arena.unlockStars === 0 ? t('Your home street') : t('{{count}} medals to enter', { count: arena.unlockStars })}</span></figcaption></figure><div class="event-grid">${LEVELS.filter((level) => level.arena === arena.id).map((level) => eventCard(level)).join('')}</div>`;
    }
    refreshIcons();
  }

  function close() {
    dialog.close();
    document.body.classList.remove('hub-open');
    stage.camera.clearViewOffset();
    stage.setView(returnView);
    applyEquipped();
    game.setPaused(false);
  }

  function open(nextTab = 'journey') {
    if (nextTab === 'collection') {
      if (showroom.open) return;
      pausedBeforeShowroom = game.snapshot().paused;
      game.setPaused(true);
      showroomFrame = document.createElement('iframe');
      showroomFrame.title = t('Marble tin');
      showroomFrame.src = pageUrl('marbles.html', { skin: progress.equipped, embed: '1' });
      showroomFrame.allowFullscreen = true;
      showroom.append(showroomFrame);
      showroom.showModal();
      document.body.classList.add('showroom-open');
      return;
    }
    window.dispatchEvent(new CustomEvent('bely-modal-open'));
    if (previewing) {
      const resume = levelById(progress.lastLevel) ?? LEVELS[0];
      load(resume);
    }
    if (!dialog.open) {
      returnView = stage.getState().view;
      game.setPaused(true);
      stage.setTour(false);
      document.querySelector<HTMLElement>('#settings')!.hidden = true;
      dialog.showModal();
      document.body.classList.add('hub-open');
    }
    tab = nextTab;
    selectedSkin = progress.equipped;
    render();
  }

  function load(level: Level, asPreview = false, asDaily = false) {
    if (!asPreview && !asDaily && !playable(level)) { toast(lockReason(level)); return false; }
    if (dialog.open) close();
    current = level;
    selectedArena = level.arena;
    previewing = asPreview;
    dailyKey = asDaily ? dailyLevel().key : undefined;
    recorded = false;
    earnedRewards = [];
    unlockedArenas = [];
    const arena = arenaById(level.arena);
    document.body.classList.toggle('arena-preview', asPreview);
    document.querySelector('#arena-label')!.textContent = `${arena.chapter} / ${t(arena.name)}`;
    document.querySelector('#event-name')!.textContent = t(level.name);
    document.querySelector('#objective')!.textContent = goal(level);
    document.querySelector('#location-label')!.textContent = t(arena.location);
    document.querySelector('#look-title')!.textContent = t({ afternoon: 'After school', overcast: 'Soft daylight', evening: 'Blue hour' }[arena.look]);
    document.querySelector('#event-rule')!.textContent = t(asPreview ? 'Arena preview' : asDaily ? 'Daily trial' : ruleNames[level.rule]);
    document.querySelector('#score-dots')!.innerHTML = '<span></span>'.repeat(level.target);
    document.querySelector<HTMLElement>('#rival-card')!.hidden = !level.rival || asPreview;
    document.querySelector('#rival-name')!.textContent = t(level.rival?.name ?? '');
    document.querySelector('#rival-title')!.textContent = t(level.rival?.title ?? '');
    document.querySelector('#rival-quip')!.textContent = t(level.rival?.opening ?? '');
    game.loadLevel(level, asPreview);
    applyEquipped();
    document.querySelectorAll<HTMLElement>('[data-look]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.look === arena.look)));
    document.querySelectorAll<HTMLElement>('[data-view]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.view === 'street')));
    document.querySelector<HTMLInputElement>('#exposure')!.value = String(stage.renderer.toneMappingExposure);
    if (!asPreview && !asDaily && !debugUnlocked) { progress.lastLevel = level.id; persist(); }
    if (asPreview) stage.setView('vista');
    profile();
    const banner = document.querySelector<HTMLElement>('#chapter-banner')!;
    banner.innerHTML = `<span>${arena.chapter} / ${t(arena.location)}</span><strong>${t(level.name)}</strong><small>${asPreview ? t('Arena preview') : goal(level)}</small>`;
    banner.classList.add('visible');
    clearTimeout(travelTimer);
    travelTimer = setTimeout(() => banner.classList.remove('visible'), 2000);
    window.dispatchEvent(new CustomEvent('bely-enter-level', { detail: { id: level.id, preview: asPreview } }));
    return true;
  }

  function showResult(state: GameState) {
    const stars = medalFor(current, state.shots, state.won);
    document.querySelector('#result-kicker')!.textContent = t(dailyKey ? 'Daily trial complete' : current.name);
    document.querySelector('#result-title')!.textContent = state.won ? t(current.id === 'king-of-the-hara' ? 'Champion of the Hara' : 'Event cleared') : current.rival ? t('{{name}} takes the circle', { name: t(current.rival.name) }) : t('Round over');
    document.querySelector('#result-stars')!.innerHTML = starIcons(stars);
    document.querySelector('#result-detail')!.textContent = state.rule === 'duel' ? t('You {{player}} - {{rival}} {{name}}. {{shots}} shots.', { player: state.score, rival: state.rivalScore, name: t(current.rival?.name ?? ''), shots: state.shots }) : t('{{score}} of {{goal}} marbles. {{shots}} shots.', { score: state.score, goal: state.goal, shots: state.shots });
    document.querySelector('#result-unlocks')!.innerHTML = [
      ...earnedRewards.map((id) => `<div><i data-lucide="gem"></i><span>${t('Earned {{name}}', { name: t(SKINS.find((skin) => skin.id === id)!.name) })}</span></div>`),
      ...unlockedArenas.map((id) => `<div><i data-lucide="map-pinned"></i><span>${t('{{name}} is open', { name: t(ARENAS.find((arena) => arena.id === id)!.name) })}</span></div>`),
    ].join('');
    const next = document.querySelector<HTMLButtonElement>('#next-event')!;
    next.hidden = !state.won || !!dailyKey || current.id === 'king-of-the-hara';
    const nextEvent = debugUnlocked ? LEVELS[(LEVELS.indexOf(current) + 1) % LEVELS.length] : nextLevel(progress, current.id);
    next.innerHTML = `${t('Next: {{name}}', { name: t(nextEvent.name) })}<i data-lucide="arrow-right"></i>`;
    document.querySelector<HTMLButtonElement>('#result-replay')!.disabled = !state.canReplay;
    refreshIcons();
  }

  function onState(state: GameState) {
    if (state.levelId !== current.id) return;
    if (state.shots === 0 && state.rivalShots === 0 && !state.active) recorded = false;
    document.querySelector('#rival-player-score')!.textContent = String(state.score);
    document.querySelector('#rival-score')!.textContent = String(state.rivalScore);
    document.querySelector('#rival-phase')!.textContent = t(state.roundOver ? 'Match complete' : state.turn === 'rival' ? state.active ? 'In play' : 'Lining up a shot' : 'Your turn');
    if (state.lastShot && current.rival) {
      document.querySelector('#rival-quip')!.textContent = t(state.roundOver ? state.won ? current.rival.lose : current.rival.win : state.lastShot.actor === 'rival' ? state.lastShot.captured ? 'Over to you.' : 'A little too much. Your shot.' : state.lastShot.captured > 1 ? 'Two with one shot. Nicely done.' : current.rival.opening);
    }
    if (state.roundOver && !previewing && !recorded) {
      recorded = true;
      if (state.won && !debugUnlocked) {
        const result = recordResult(progress, current, medalFor(current, state.shots, true), state.shots, state.score, dailyKey);
        progress = result.progress;
        earnedRewards = result.rewards;
        unlockedArenas = result.unlocked;
        persist();
        profile();
      }
      showResult(state);
    }
    document.querySelector<HTMLElement>('#round-result')!.hidden = !state.roundOver || state.replaying || state.paused || previewing;
  }

  function retry() {
    recorded = false;
    earnedRewards = [];
    unlockedArenas = [];
    game.setPaused(false);
    game.reset();
  }

  dialog.addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button');
    if (!button || button.disabled) return;
    if (button.id === 'close-journey') close();
    if (button.dataset.tab) { if (button.dataset.tab === 'collection') open('collection'); else { tab = button.dataset.tab; render(); } }
    if (button.dataset.arena) { selectedArena = button.dataset.arena as ArenaId; tab = 'journey'; render(); }
    if (button.dataset.start) { const level = levelById(button.dataset.start); if (level) load(level, false, button.dataset.daily === 'true'); }
    if (button.dataset.visit) { const level = levelById(button.dataset.visit); if (level) load(level, true); }
    if (button.dataset.skin) { selectedSkin = button.dataset.skin; render(); }
    if (button.id === 'equip-skin' && canEquip(progress, selectedSkin)) {
      progress.equipped = selectedSkin;
      applyEquipped();
      persist();
      render();
    }
  });
  dialog.addEventListener('cancel', (event) => { event.preventDefault(); close(); });
  dialog.querySelectorAll<HTMLElement>('[data-tab]').forEach((button, index, buttons) => button.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const next = (index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
    buttons[next].focus();
    const nextTab = buttons[next].dataset.tab!;
    if (nextTab === 'collection') open('collection'); else { tab = nextTab; render(); }
  }));
  document.querySelector('#open-journey')!.addEventListener('click', () => open());
  document.querySelector('#open-collection')!.addEventListener('click', () => open('collection'));
  document.querySelector('#open-daily')!.addEventListener('click', () => open('daily'));
  document.querySelector('#leave-preview')!.addEventListener('click', () => open());
  document.querySelector('#result-journey')!.addEventListener('click', () => open());
  document.querySelector('#next-event')!.addEventListener('click', () => load(debugUnlocked ? LEVELS[(LEVELS.indexOf(current) + 1) % LEVELS.length] : nextLevel(progress, current.id)));
  document.querySelector('#play-again')!.addEventListener('click', retry);
  document.querySelector('#result-replay')!.addEventListener('click', () => game.replay());
  document.querySelector('#sound')!.addEventListener('change', (event) => { progress.settings.sound = (event.target as HTMLInputElement).checked; persist(); });
  document.querySelector('#aim-assist')!.addEventListener('change', (event) => { progress.settings.assists = (event.target as HTMLInputElement).checked; game.setGuide(progress.settings.assists); persist(); });
  function syncDebug() {
    document.querySelector<HTMLInputElement>('#debug-unlock')!.checked = debugUnlocked;
    document.querySelector<HTMLElement>('#debug-badge')!.hidden = !debugUnlocked;
    document.querySelector('#save-state')!.textContent = t(debugUnlocked ? 'Debug session / progress unchanged' : 'Progress saved');
    document.querySelector('#debug-badge')!.textContent = t('DEBUG');
  }
  document.querySelector('#debug-unlock')!.addEventListener('change', (event) => {
    debugUnlocked = (event.target as HTMLInputElement).checked;
    try { sessionStorage.setItem('bely-debug-unlock', debugUnlocked ? '1' : '0'); } catch { toast(t('Session only')); }
    const url = new URL(location.href);
    if (debugUnlocked) url.searchParams.set('debug', '1'); else url.searchParams.delete('debug');
    history.replaceState(null, '', url);
    if (!debugUnlocked && !canPlay(progress, current)) load(levelById(progress.lastLevel) ?? LEVELS[0]);
    syncDebug();
    if (dialog.open) render();
  });
  addEventListener('keydown', (event) => {
    if (event.target instanceof Element && event.target.closest('input, select, textarea, button, a')) return;
    if (event.key.toLowerCase() === 'm') { event.preventDefault(); if (dialog.open) close(); else open(); }
    if (event.key.toLowerCase() === 'i') { event.preventDefault(); open('collection'); }
  });
  window.addEventListener('bely-language', () => {
    const arena = arenaById(current.arena);
    document.querySelector('#arena-label')!.textContent = `${arena.chapter} / ${t(arena.name)}`;
    document.querySelector('#event-name')!.textContent = t(current.name);
    document.querySelector('#objective')!.textContent = goal(current);
    document.querySelector('#location-label')!.textContent = t(arena.location);
    document.querySelector('#look-title')!.textContent = t({ afternoon: 'After school', overcast: 'Soft daylight', evening: 'Blue hour' }[stage.getState().look]);
    document.querySelector('#event-rule')!.textContent = t(previewing ? 'Arena preview' : dailyKey ? 'Daily trial' : ruleNames[current.rule]);
    document.querySelector('#rival-name')!.textContent = t(current.rival?.name ?? '');
    document.querySelector('#rival-title')!.textContent = t(current.rival?.title ?? '');
    document.querySelector('#rival-quip')!.textContent = t(current.rival?.opening ?? '');
    syncDebug();
    profile();
    if (dialog.open) render();
    if (game.snapshot().roundOver) showResult(game.snapshot());
  });

  return {
    onState, open, close, retry,
    resume() { load(current, previewing, !!dailyKey); },
    start() {
      syncDebug();
      document.querySelector<HTMLInputElement>('#sound')!.checked = progress.settings.sound;
      document.querySelector<HTMLInputElement>('#aim-assist')!.checked = progress.settings.assists;
      if (!progress.settings.sound) game.setSound(false);
      game.setGuide(progress.settings.assists);
      load(current);
      if (new URLSearchParams(location.search).get('menu') === 'journey') open();
    },
    preview(id: string) { const level = levelById(id); return level ? load(level, true) : false; },
    play(id: string) { const level = levelById(id); return level ? load(level) : false; },
    state: () => ({ progress: JSON.parse(JSON.stringify(progress)), current: current.id, preview: previewing, daily: dailyKey ?? null, debug: debugUnlocked, medals: totalStars(progress), rank: rank(progress), available: LEVELS.filter(playable).map((level) => level.id) }),
  };
}

export type Journey = ReturnType<typeof createJourney>;