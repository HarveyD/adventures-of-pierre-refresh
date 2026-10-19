import './style.css';
import { createElement, Pause, Play, RotateCcw, Volume2, VolumeX, Settings as SettingsIcon, Maximize, Home, X, ArrowLeft, ArrowRight, ArrowUp, Heart, Flag } from 'lucide';
import type { IconNode } from 'lucide';
import { mountPierreGame } from './game/phaserApp';
import type { HudSnapshot } from './game/phaserApp';
import { assetUrl, legacyUrl } from './game/legacyAssets';
import { HeldInputs, actionForKey } from './game/input';
import { LEVEL_NAMES } from './game/modeConfig';
import { defaults, keyLabel, loadSettings, saveSettings } from './game/settings';
import type { ActionName } from './game/runtime';
import type { RouteMode } from './game/types';

const root = document.querySelector<HTMLDivElement>('#app')!;
const relativePath = window.location.pathname.slice(import.meta.env.BASE_URL.replace(/\/$/, '').length).replace(/\/index\.html$/, '').replace(/\/+$/, '') || '/';
const mode: RouteMode = relativePath === '/original' ? 'original' : 'refresh';
const settings = loadSettings();
const icon = (node: IconNode) => createElement(node, { width: 20, height: 20, 'aria-hidden': 'true', 'stroke-width': 1.8 }).outerHTML;
const tool = (id: string, label: string, node: IconNode) => `<button id="${id}" class="icon-button" aria-label="${label}" title="${label}" data-tooltip="${label}">${icon(node)}</button>`;
root.innerHTML = `
  <main class="game-app ${mode}">
    <header class="app-header">
      <div class="brand"><img src="${assetUrl('assets/derived/player-run-right.png')}" alt="" class="brand-pierre"><div><h1>Adventures of Pierre</h1><span>By Harvey &amp; James</span></div></div>
      <nav class="mode-switch" aria-label="Game edition"><a href="${assetUrl('original/')}" ${mode === 'original' ? 'aria-current="page"' : ''}>Original</a><a href="${assetUrl('refresh/')}" ${mode === 'refresh' ? 'aria-current="page"' : ''}>Refresh</a></nav>
      <div class="tools">${tool('menu', 'Menu', Home)}${tool('pause', 'Pause', Pause)}${tool('restart', 'Restart level', RotateCcw)}${tool('mute', 'Mute', Volume2)}${tool('settings', 'Settings', SettingsIcon)}${tool('fullscreen', 'Fullscreen', Maximize)}</div>
    </header>
    <div class="hud" aria-label="Game status"><div class="level-hud">${icon(Flag)}<span id="level-name">The training grounds</span></div><div class="lives-hud">${icon(Heart)}<span id="lives">5</span></div><span id="audio-status" hidden>Audio unavailable</span><span class="edition-label">${mode === 'original' ? 'Original edition' : 'Refresh edition'}</span></div>
    <section class="playfield" aria-label="Pierre game" tabindex="0">
      <div id="game-root"></div><div id="overlay" class="overlay"></div>
    </section>
    <footer class="game-footer"><span id="checkpoint-status" aria-live="polite"></span><span class="level-number" id="level-number">01 / 05</span></footer>
    <div class="touch-controls" aria-label="Touch controls"><div><button data-action="left" aria-label="Move left">${icon(ArrowLeft)}</button><button data-action="right" aria-label="Move right">${icon(ArrowRight)}</button></div><button data-action="jump" aria-label="Jump">${icon(ArrowUp)}</button></div>
  </main>
  <dialog id="settings-dialog" aria-labelledby="settings-title">
    <div class="dialog-heading"><h2 id="settings-title">Settings</h2>${tool('close-settings', 'Close settings', X)}</div>
    <label class="volume-label" for="volume">${mode === 'refresh' ? 'Audio' : 'Music'} <output id="volume-value"></output></label><input id="volume" type="range" min="0" max="1" step="0.05" value="${settings.volume}">
    <div class="bindings"><h3>Controls</h3>${(['left', 'right', 'jump'] as ActionName[]).map(action => `<div><label for="bind-${action}">${action === 'jump' ? 'Jump' : 'Move ' + action}</label><button id="bind-${action}" data-bind="${action}"></button></div>`).join('')}</div>
    <p id="binding-status" class="binding-status" aria-live="polite"></p>
    <div class="dialog-actions"><button id="reset-controls">Reset controls</button><button id="reset-progress">Reset progress</button></div>
  </dialog>
`;
const node = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const overlay = node('overlay');
const field = document.querySelector<HTMLElement>('.playfield')!;
const dialog = node<HTMLDialogElement>('settings-dialog');
let panel: 'menu' | 'controls' | 'help' | 'levels' | null = 'menu';
let hud: HudSnapshot;
let overlayKey = '';
let remapping: ActionName | null = null;
let wasPaused = false;
let lastLevel = 1;
let handle: ReturnType<typeof mountPierreGame>;
const inputs = new HeldInputs((action, pressed) => handle?.setAction(action, pressed));
const focusGame = () => field.focus({ preventScroll: true });
const bitmap = (filename: string, regions: string, extra = '') =>
  `<div class="bitmap-panel"><img src="${legacyUrl(filename)}" alt="" draggable="false">${regions}${extra}</div>`;
const region = (action: string, label: string, x: number, y: number, width: number, height: number) =>
  `<button class="bitmap-region" data-command="${action}" aria-label="${label}" style="left:${x / 12.8}%;top:${y / 7.2}%;width:${width / 12.8}%;height:${height / 7.2}%"><span class="sr-only">${label}</span></button>`;
const commands = (title: string, buttons: string, kicker = '') => `<div class="screen-menu"><p class="screen-kicker">${kicker}</p><h2>${title}</h2><div class="screen-actions">${buttons}</div></div>`;
const commandButton = (command: string, label: string, primary = false) => `<button data-command="${command}" class="${primary ? 'primary' : 'secondary'}">${label}</button>`;
overlay.addEventListener('error', event => {
  if (event.target instanceof HTMLImageElement) {
    overlay.innerHTML = commands('The menu artwork could not load', commandButton('reload', 'Try again', true));
  }
}, true);
const renderOverlay = () => {
  if (!hud) return;
  const key = [hud.ready, hud.error, hud.status, hud.paused, panel, settings.unlocked].join('|');
  if (key === overlayKey) {
    const progress = overlay.querySelector<HTMLProgressElement>('progress');
    if (progress) progress.value = hud.loading;
    return;
  }
  overlayKey = key;
  overlay.hidden = false;
  if (hud.error) {
    overlay.innerHTML = commands('The adventure could not load', commandButton('reload', 'Try again', true));
  } else if (!hud.ready) {
    overlay.innerHTML = '<div class="loading"><span>Adventures of Pierre</span><progress max="1" value="' + hud.loading + '" aria-label="Loading game"></progress></div>';
  } else if (panel === 'controls' && mode === 'original') {
    overlay.innerHTML = bitmap('ControlScreen.png',
      (['left', 'right', 'jump'] as ActionName[]).map((action, i) => `<button class="bitmap-binding" data-bind="${action}" style="top:${(146 + i * 188) / 7.2}%" aria-label="Remap ${action}">${keyLabel(settings.original[action])}</button>`).join('') +
      region('back', 'Back to menu', 799, 515, 441, 133));
  } else if (panel === 'help' && mode === 'original') {
    overlay.innerHTML = bitmap('HelpScreen.png', region('back', 'Back to menu', 961, 596, 308, 109));
  } else if (panel === 'levels') {
    overlay.innerHTML = `<div class="level-menu"><h2>Choose a chapter</h2><ol>${LEVEL_NAMES.map((name, index) => `<li><button data-level="${index}" ${index > settings.unlocked ? 'disabled' : ''}><span>0${index + 1}</span>${name}</button></li>`).join('')}</ol>${commandButton('back', 'Back')}</div>`;
  } else if (panel === 'menu') {
    if (mode === 'original') overlay.innerHTML = bitmap('MenuScreen.png',
      region('new', 'Start original game', 333, 155, 598, 152) + region('controls', 'Controls', 333, 349, 598, 152) +
      region('help', 'Help', 333, 546, 598, 152) + region('refresh', 'Switch to Refresh', 1063, 0, 217, 100),
      '<span class="original-credit">By Harvey and James</span>');
    else overlay.innerHTML = commands('Adventures of Pierre',
      commandButton('new', 'Start adventure', true) + commandButton('levels', 'Chapters') + commandButton('settings', 'Settings'), 'Harvey & James');
  } else if (hud.status === 'game-over') {
    if (mode === 'original') overlay.innerHTML = bitmap('GameOver.png', region('retry', 'Try again', 901, 563, 370, 142));
    else overlay.innerHTML = commands('One more adventure?', commandButton('retry', 'Retry chapter', true) + commandButton('new', 'New adventure') + commandButton('menu', 'Menu'), 'Out of lives');
  } else if (hud.status === 'finished') {
    overlay.innerHTML = commands(mode === 'original' ? 'Thanks for playing Pierre' : 'A feast well earned',
      commandButton('new', 'Play again', true) + commandButton('menu', 'Menu'), mode === 'original' ? 'Harvey & James' : 'The adventure is complete');
  } else if (hud.paused) {
    overlay.innerHTML = commands('Taking a breather', commandButton('resume', 'Resume', true) + commandButton('retry', 'Restart chapter') + commandButton('menu', 'Menu'), 'Paused');
  } else {
    overlay.innerHTML = ''; overlay.hidden = true;
  }
};
const updateHud = (next: HudSnapshot) => {
  hud = next;
  node('level-name').textContent = next.levelName;
  node('lives').textContent = String(next.lives);
  node('level-number').textContent = '0' + next.level + ' / 05';
  node('audio-status').hidden = next.audioAvailable;
  if (mode === 'refresh' && next.started && next.level - 1 > settings.unlocked) {
    settings.unlocked = next.level - 1; saveSettings(settings);
  }
  if (next.level !== lastLevel) { node('checkpoint-status').textContent = ''; lastLevel = next.level; }
  node('checkpoint-status').textContent = next.checkpoint ? 'Checkpoint reached' : '';
  node<HTMLButtonElement>('pause').disabled = !next.ready || !next.started || next.status !== 'playing' || panel !== null;
  node<HTMLButtonElement>('restart').disabled = !next.ready || !next.started;
  node('pause').innerHTML = icon(next.paused ? Play : Pause);
  node('pause').setAttribute('aria-label', next.paused ? 'Resume' : 'Pause');
  node('pause').setAttribute('title', next.paused ? 'Resume' : 'Pause');
  node('pause').dataset.tooltip = next.paused ? 'Resume' : 'Pause';
  renderOverlay();
};
handle = mountPierreGame(mode, node('game-root'), updateHud);
handle.setAudio(settings.muted, settings.volume);

const updateBindings = () => {
  for (const action of ['left', 'right', 'jump'] as ActionName[]) {
    node('bind-' + action).textContent = keyLabel(settings[mode][action]);
    const bitmapButton = overlay.querySelector<HTMLElement>('[data-bind="' + action + '"]');
    if (bitmapButton) bitmapButton.textContent = keyLabel(settings[mode][action]);
  }
  node('volume-value').textContent = Math.round(settings.volume * 100) + '%';
  node('mute').innerHTML = icon(settings.muted ? VolumeX : Volume2);
  node('mute').setAttribute('aria-label', settings.muted ? 'Unmute' : 'Mute');
  node('mute').setAttribute('title', settings.muted ? 'Unmute' : 'Mute');
  node('mute').dataset.tooltip = settings.muted ? 'Unmute' : 'Mute';
};
const openSettings = () => {
  inputs.clear(); wasPaused = !hud.started || hud.paused || hud.status !== 'playing';
  handle.setPaused(true); updateBindings(); dialog.showModal();
};
const showMenu = () => { inputs.clear(); panel = 'menu'; handle.menu(); renderOverlay(); };
const start = (fresh: boolean) => { inputs.clear(); panel = null; fresh ? handle.newRun() : handle.start(); focusGame(); renderOverlay(); };
const execute = (command: string) => {
  if (command === 'reload') { location.reload(); return; }
  if (!hud.ready) return;
  if (command === 'new') start(true);
  else if (command === 'resume') { inputs.clear(); panel = null; handle.setPaused(false); focusGame(); }
  else if (command === 'retry') { inputs.clear(); panel = null; handle.restartLevel(); focusGame(); }
  else if (command === 'menu') showMenu();
  else if (command === 'controls' || command === 'help' || command === 'levels') { panel = command; renderOverlay(); }
  else if (command === 'back') { remapping = null; panel = 'menu'; renderOverlay(); }
  else if (command === 'refresh') location.assign(assetUrl('refresh/'));
  else if (command === 'settings') openSettings();
};
root.addEventListener('click', event => {
  const target = (event.target as HTMLElement).closest<HTMLElement>('[data-command], [data-level], [data-bind]');
  if (!target) return;
  if (target.dataset.command) execute(target.dataset.command);
  if (target.dataset.level) {
    const level = Number(target.dataset.level);
    if (level > settings.unlocked) return;
    inputs.clear(); panel = null; handle.selectLevel(level); focusGame();
  }
  if (target.dataset.bind) {
    remapping = target.dataset.bind as ActionName;
    target.textContent = 'Press a key';
    node('binding-status').textContent = '';
  }
});
node('menu').addEventListener('click', showMenu);
node('pause').addEventListener('click', () => { inputs.clear(); handle.togglePause(); focusGame(); });
node('restart').addEventListener('click', () => execute('retry'));
node('settings').addEventListener('click', openSettings);
node('mute').addEventListener('click', () => {
  settings.muted = !settings.muted; saveSettings(settings);
  handle.setAudio(settings.muted, settings.volume); updateBindings(); focusGame();
});
node('fullscreen').addEventListener('click', () => {
  if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
  else void root.querySelector('main')!.requestFullscreen().catch(() => {});
});
node('close-settings').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => {
  remapping = null; node('binding-status').textContent = '';
  if (!wasPaused) { handle.setPaused(false); focusGame(); }
});
node('volume').addEventListener('input', () => {
  settings.volume = Number(node<HTMLInputElement>('volume').value); saveSettings(settings);
  handle.setAudio(settings.muted, settings.volume); updateBindings();
});
node('reset-controls').addEventListener('click', () => { settings[mode] = defaults()[mode]; saveSettings(settings); updateBindings(); });
node('reset-progress').addEventListener('click', () => {
  settings.unlocked = 0; saveSettings(settings); node('binding-status').textContent = 'Chapter progress reset.';
});
const editable = (target: EventTarget | null) => target instanceof HTMLInputElement || target instanceof HTMLSelectElement;
const keydown = (event: KeyboardEvent) => {
  if (remapping) {
    event.preventDefault();
    if (event.code === 'Escape') { remapping = null; updateBindings(); return; }
    const reserved = ['Escape', 'Tab', 'Enter', 'KeyP', 'KeyR', 'F5', 'F11', 'Backquote'];
    const other = (Object.keys(settings[mode]) as ActionName[]).some(action => action !== remapping && settings[mode][action] === event.code);
    if (event.ctrlKey || event.metaKey || event.altKey || reserved.includes(event.code) || other || !/^(Key[A-Z]|Digit[0-9]|Space|Arrow(Left|Right|Up|Down))$/.test(event.code)) {
      node('binding-status').textContent = 'That key is unavailable.'; return;
    }
    settings[mode][remapping] = event.code; remapping = null;
    saveSettings(settings); updateBindings(); return;
  }
  if (dialog.open || editable(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;
  if ((event.code === 'Escape' || event.code === 'KeyP' || event.code === 'Backquote') && panel === null && hud.started) {
    event.preventDefault(); if (!event.repeat) { inputs.clear(); handle.togglePause(); } return;
  }
  if (event.code === 'KeyR' && panel === null && hud.started) {
    event.preventDefault(); if (!event.repeat) execute('retry'); return;
  }
  if (panel !== null || !hud.started || hud.paused || hud.status !== 'playing') return;
  const action = actionForKey(event.code, mode, settings[mode]);
  if (action) { event.preventDefault(); if (!event.repeat) inputs.set(event.code, action, true); }
};
const keyup = (event: KeyboardEvent) => { inputs.release(event.code); };
window.addEventListener('keydown', keydown);
window.addEventListener('keyup', keyup);
const loseFocus = () => {
  inputs.clear();
  if (hud?.started && hud.status === 'playing' && !hud.paused) handle.setPaused(true);
};
window.addEventListener('blur', loseFocus);
document.addEventListener('visibilitychange', () => { if (document.hidden) loseFocus(); });
document.querySelectorAll<HTMLElement>('[data-action]').forEach(button => {
  button.addEventListener('pointerdown', event => {
    if (panel !== null || hud.paused) return;
    event.preventDefault(); button.setPointerCapture(event.pointerId);
    inputs.set('pointer:' + event.pointerId, button.dataset.action as ActionName, true);
    button.classList.add('pressed');
  });
  const release = (event: PointerEvent) => { inputs.release('pointer:' + event.pointerId); button.classList.remove('pressed'); };
  button.addEventListener('pointerup', release); button.addEventListener('pointercancel', release); button.addEventListener('lostpointercapture', release);
});
updateBindings();
window.addEventListener('beforeunload', () => { inputs.clear(); handle.destroy(); }, { once: true });
