/**
 * Processo principal do Aetherguide (Electron).
 *
 *  - Janela principal: o guia (index.html).
 *  - Janela de overlay: transparente, sempre por cima do jogo; quando "travada",
 *    os cliques atravessam para o jogo.
 *  - Ícone na bandeja e atalhos globais (Ctrl+Shift+O mostra/oculta, Ctrl+Shift+L trava/destrava).
 *
 * Os dados do jogo continuam vindo do ACT/IINACT pelo WebSocket do OverlayPlugin.
 * O jogo precisa estar em "Borderless Windowed" para o overlay aparecer por cima.
 */
import {
  app, BrowserWindow, Menu, Tray, globalShortcut, ipcMain, nativeImage, net, protocol, screen, shell,
} from 'electron';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, normalize, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIST = join(HERE, '..', 'dist');
const PRELOAD = join(HERE, 'preload.cjs');
const DEV_URL = process.env.VITE_DEV_SERVER_URL || null;
const SELFTEST = process.argv.includes('--selftest');
const ALL_MODULES = ['coach', 'gauge', 'dot', 'cds', 'burst', 'food', 'chat'];
// alto o bastante para 3 avisos de chat; a área vazia é transparente e não bloqueia cliques quando travado
const OVERLAY_SIZE = { width: 380, height: 760 };
const SHORTCUTS = { toggle: 'CommandOrControl+Shift+O', lock: 'CommandOrControl+Shift+L' };

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
]);

// o autoteste usa uma pasta de configurações separada para não mexer na sua
if (SELFTEST) app.setPath('userData', join(app.getPath('temp'), 'aetherguide-selftest-profile'));

/** @type {BrowserWindow | null} */ let mainWin = null;
/** @type {BrowserWindow | null} */ let overlayWin = null;
/** @type {Tray | null} */ let tray = null;
let quitting = false;
let trayHintShown = false;

/* ---------------- configurações ---------------- */

const DEFAULTS = {
  overlay: {
    visible: true,
    locked: false,
    source: 'ws',
    wsUrl: 'ws://127.0.0.1:10501/ws',
    modules: ALL_MODULES,
    x: null,
    y: null,
  },
};
let settings = structuredClone(DEFAULTS);
const settingsFile = () => join(app.getPath('userData'), 'settings.json');

function loadSettings() {
  try {
    const saved = JSON.parse(readFileSync(settingsFile(), 'utf8'));
    settings = { overlay: { ...DEFAULTS.overlay, ...saved.overlay } };
  } catch {
    settings = structuredClone(DEFAULTS);
  }
}

function saveSettings() {
  mkdirSync(dirname(settingsFile()), { recursive: true });
  writeFileSync(settingsFile(), JSON.stringify(settings, null, 2));
}

/* ---------------- URLs e protocolo app:// ---------------- */

function pageUrl(page, params, hash = '') {
  const qs = params ? `?${new URLSearchParams(params)}` : '';
  return DEV_URL ? new URL(`${page}${qs}${hash}`, DEV_URL).href : `app://aetherguide/${page}${qs}${hash}`;
}

function overlayUrl() {
  const o = settings.overlay;
  const params = { modules: o.modules.join(',') };
  if (o.source === 'demo') params.demo = '1';
  else params.OVERLAY_WS = o.wsUrl;
  return pageUrl('overlay.html', params);
}

const isAppUrl = (url) => url.startsWith('app://aetherguide/') || (!!DEV_URL && url.startsWith(DEV_URL));

function openExternal(url) {
  if (/^https?:\/\//.test(url)) shell.openExternal(url);
}

function registerAppProtocol() {
  protocol.handle('app', (req) => {
    const { pathname } = new URL(req.url);
    const file = normalize(join(DIST, decodeURIComponent(pathname)));
    if (!file.startsWith(DIST + sep)) return new Response('Not found', { status: 404 });
    return net.fetch(pathToFileURL(file).href);
  });
}

function iconPath() {
  const built = join(DIST, 'icon.png');
  return existsSync(built) ? built : join(HERE, '..', 'public', 'icon.png');
}

/* ---------------- janelas ---------------- */

function createMainWindow(hash = '') {
  mainWin = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    title: 'Aetherguide',
    icon: iconPath(),
    backgroundColor: '#0e0c16',
    autoHideMenuBar: true,
    show: false,
    webPreferences: { preload: PRELOAD, contextIsolation: true, sandbox: true },
  });
  mainWin.webContents.setWindowOpenHandler(({ url }) => {
    openExternal(url);
    return { action: 'deny' };
  });
  mainWin.webContents.on('will-navigate', (e, url) => {
    if (!isAppUrl(url)) {
      e.preventDefault();
      openExternal(url);
    }
  });
  // fechar a janela só esconde: o overlay continua funcionando pela bandeja
  mainWin.on('close', (e) => {
    if (quitting) return;
    e.preventDefault();
    mainWin.hide();
    if (!trayHintShown && tray) {
      trayHintShown = true;
      tray.displayBalloon({
        title: 'Aetherguide continua aberto',
        content: 'O overlay segue funcionando. Use o ícone na bandeja para abrir ou sair.',
        iconType: 'info',
      });
    }
  });
  mainWin.once('ready-to-show', () => mainWin.show());
  mainWin.loadURL(pageUrl('index.html', null, hash));
}

function showMain() {
  if (!mainWin) return createMainWindow();
  if (mainWin.isMinimized()) mainWin.restore();
  mainWin.show();
  mainWin.focus();
}

function defaultOverlayPosition() {
  const area = screen.getPrimaryDisplay().workArea;
  return { x: area.x + area.width - OVERLAY_SIZE.width - 24, y: area.y + 80 };
}

function savedPositionIsVisible(x, y) {
  return screen.getAllDisplays().some(({ workArea: a }) =>
    x >= a.x - 50 && y >= a.y - 50 && x < a.x + a.width - 50 && y < a.y + a.height - 50);
}

function createOverlay() {
  const o = settings.overlay;
  const pos = o.x !== null && o.y !== null && savedPositionIsVisible(o.x, o.y) ? { x: o.x, y: o.y } : defaultOverlayPosition();
  overlayWin = new BrowserWindow({
    ...OVERLAY_SIZE,
    ...pos,
    title: 'Aetherguide Overlay',
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    show: false,
    webPreferences: {
      preload: PRELOAD,
      contextIsolation: true,
      sandbox: true,
      // mantém os timers rodando mesmo sem foco (o foco fica no jogo)
      backgroundThrottling: false,
    },
  });
  // nível "screen-saver" fica acima de jogos em janela sem bordas
  overlayWin.setAlwaysOnTop(true, 'screen-saver');
  overlayWin.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  overlayWin.webContents.on('will-navigate', (e, url) => {
    if (!isAppUrl(url)) e.preventDefault();
  });
  overlayWin.on('moved', () => {
    const [x, y] = overlayWin.getPosition();
    settings.overlay.x = x;
    settings.overlay.y = y;
    saveSettings();
  });
  overlayWin.webContents.on('did-finish-load', () => applyLock());
  overlayWin.once('ready-to-show', () => {
    if (settings.overlay.visible) overlayWin.showInactive();
  });
  overlayWin.loadURL(overlayUrl());
}

function applyLock() {
  if (!overlayWin) return;
  const locked = settings.overlay.locked;
  // travado: cliques atravessam para o jogo; destravado: dá para arrastar
  overlayWin.setIgnoreMouseEvents(locked, { forward: true });
  overlayWin.setFocusable(!locked);
  overlayWin.webContents.send('overlay:lock', locked);
}

/** Aplica mudanças vindas da interface, da bandeja ou dos atalhos (com validação). */
function updateOverlay(patch = {}) {
  const before = { ...settings.overlay };
  const next = { ...settings.overlay };
  if (typeof patch.visible === 'boolean') next.visible = patch.visible;
  if (typeof patch.locked === 'boolean') next.locked = patch.locked;
  if (patch.source === 'ws' || patch.source === 'demo') next.source = patch.source;
  if (typeof patch.wsUrl === 'string' && /^wss?:\/\/[^\s]+$/.test(patch.wsUrl.trim())) next.wsUrl = patch.wsUrl.trim();
  if (Array.isArray(patch.modules)) next.modules = ALL_MODULES.filter((m) => patch.modules.includes(m));
  if (patch.resetPosition) {
    next.x = null;
    next.y = null;
  }
  settings.overlay = next;
  saveSettings();

  if (overlayWin) {
    if (patch.resetPosition) {
      const p = defaultOverlayPosition();
      overlayWin.setPosition(p.x, p.y);
    }
    if (before.source !== next.source || before.wsUrl !== next.wsUrl || before.modules.join() !== next.modules.join()) {
      overlayWin.loadURL(overlayUrl());
    }
    if (before.locked !== next.locked) applyLock();
    if (next.visible) overlayWin.showInactive();
    else overlayWin.hide();
  }
  for (const w of BrowserWindow.getAllWindows()) w.webContents.send('settings:changed', settings);
  refreshTrayMenu();
  return settings;
}

/* ---------------- bandeja e atalhos ---------------- */

function refreshTrayMenu() {
  if (!tray) return;
  const o = settings.overlay;
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Abrir Aetherguide', click: showMain },
    { type: 'separator' },
    { label: 'Mostrar overlay', type: 'checkbox', checked: o.visible, accelerator: SHORTCUTS.toggle, click: () => updateOverlay({ visible: !o.visible }) },
    { label: 'Travar overlay (cliques passam para o jogo)', type: 'checkbox', checked: o.locked, accelerator: SHORTCUTS.lock, click: () => updateOverlay({ locked: !o.locked }) },
    { label: 'Modo demonstração', type: 'checkbox', checked: o.source === 'demo', click: () => updateOverlay({ source: o.source === 'demo' ? 'ws' : 'demo' }) },
    { label: 'Voltar overlay para a posição padrão', click: () => updateOverlay({ resetPosition: true }) },
    { type: 'separator' },
    { label: 'Sair', click: () => { quitting = true; app.quit(); } },
  ]));
}

function createTray() {
  tray = new Tray(nativeImage.createFromPath(iconPath()).resize({ width: 16, height: 16 }));
  tray.setToolTip('Aetherguide');
  tray.on('click', showMain);
  refreshTrayMenu();
}

function registerShortcuts() {
  const ok = {
    toggle: globalShortcut.register(SHORTCUTS.toggle, () => updateOverlay({ visible: !settings.overlay.visible })),
    lock: globalShortcut.register(SHORTCUTS.lock, () => updateOverlay({ locked: !settings.overlay.locked })),
  };
  for (const [name, registered] of Object.entries(ok)) {
    if (!registered) console.warn(`Atalho ${SHORTCUTS[name]} já está em uso por outro programa.`);
  }
  return ok;
}

/* ---------------- IPC ---------------- */

ipcMain.handle('settings:get', () => settings);
ipcMain.handle('overlay:set', (_e, patch) => updateOverlay(patch && typeof patch === 'object' ? patch : {}));

/* ---------------- autoteste ---------------- */

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function selftest(shortcuts) {
  const dir = process.env.SELFTEST_DIR || join(app.getPath('temp'), 'aetherguide-selftest');
  mkdirSync(dir, { recursive: true });
  await wait(7000);
  const capture = async (win, name) => {
    const img = await win.webContents.capturePage();
    writeFileSync(join(dir, `${name}.png`), img.toPNG());
    return img.getSize();
  };
  const report = { dir, shots: {} };
  report.shots.main = await capture(mainWin, 'main');
  report.shots.overlayUnlocked = await capture(overlayWin, 'overlay-destravado');
  updateOverlay({ locked: true });
  await wait(800);
  report.shots.overlayLocked = await capture(overlayWin, 'overlay-travado');
  report.overlay = {
    visible: overlayWin.isVisible(),
    alwaysOnTop: overlayWin.isAlwaysOnTop(),
    focusable: overlayWin.isFocusable(),
    bounds: overlayWin.getBounds(),
    url: overlayWin.webContents.getURL(),
    text: await overlayWin.webContents.executeJavaScript(`document.querySelector('.ov-panel')?.innerText.slice(0, 200)`),
    bodyClass: await overlayWin.webContents.executeJavaScript('document.body.className'),
  };
  report.main = {
    url: mainWin.webContents.getURL(),
    h1: await mainWin.webContents.executeJavaScript(`document.querySelector('main h1')?.textContent`),
    desktopPanel: await mainWin.webContents.executeJavaScript(`!!document.querySelector('[data-desktop-panel]')`),
    iconsOk: await mainWin.webContents.executeJavaScript(
      `Promise.all([...document.querySelectorAll('img')].slice(0, 5).map(i => fetch(i.src).then(r => r.ok)))`),
  };
  report.tray = !!tray;
  report.shortcuts = shortcuts;
  console.log(`SELFTEST ${JSON.stringify(report)}`);
  quitting = true;
  app.quit();
}

/* ---------------- ciclo de vida ---------------- */

const gotLock = SELFTEST || app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', showMain);
  app.on('before-quit', () => { quitting = true; });
  app.on('will-quit', () => globalShortcut.unregisterAll());

  app.whenReady().then(() => {
    loadSettings();
    if (SELFTEST) {
      const source = process.env.SELFTEST_SOURCE === 'ws' ? 'ws' : 'demo';
      settings.overlay = { ...settings.overlay, source, visible: true, locked: false };
    }
    registerAppProtocol();
    createTray();
    createMainWindow(SELFTEST ? '#/overlay' : '');
    createOverlay();
    const shortcuts = registerShortcuts();
    if (SELFTEST) selftest(shortcuts);
  });
}
