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
import {
  appendFileSync, closeSync, existsSync, mkdirSync, openSync, readFileSync, readSync, readdirSync, statSync, unlinkSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, join, normalize, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIST = join(HERE, '..', 'dist');
const PRELOAD = join(HERE, 'preload.cjs');
const DEV_URL = process.env.VITE_DEV_SERVER_URL || null;
const SELFTEST = process.argv.includes('--selftest');
// mesma ordem e padrões de src/overlay/modules.ts
const ALL_MODULES = ['callouts', 'duty', 'voice', 'coach', 'gauge', 'dot', 'cds', 'burst', 'food', 'chat'];
const DEFAULT_MODULES = ALL_MODULES.filter((m) => m !== 'voice');
/** módulos que existiam até a v0.2.0 (para ligar os novos em quem atualizar) */
const LEGACY_MODULES = ['coach', 'gauge', 'dot', 'cds', 'burst', 'food', 'chat'];
// alto o bastante para 3 avisos de chat; a área vazia é transparente e não bloqueia cliques quando travado
const OVERLAY_SIZE = { width: 380, height: 760 };
const SHORTCUTS = {
  toggle: 'CommandOrControl+Shift+O',
  lock: 'CommandOrControl+Shift+L',
  record: 'CommandOrControl+Shift+R',
};
const REPLAY_SPEEDS = [0.5, 1, 2, 4, 8];

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
    modules: DEFAULT_MODULES,
    knownModules: ALL_MODULES,
    x: null,
    y: null,
    replayFile: null,
    replaySpeed: 1,
  },
  // tells, FC e linkshells ficam fora das gravações por padrão
  recorder: { includePrivateChat: false },
};
let settings = structuredClone(DEFAULTS);
const settingsFile = () => join(app.getPath('userData'), 'settings.json');

function loadSettings() {
  let saved = null;
  try {
    saved = JSON.parse(readFileSync(settingsFile(), 'utf8'));
  } catch {
    // primeira execução (ou arquivo corrompido): usa os padrões
  }
  settings = {
    overlay: { ...DEFAULTS.overlay, ...saved?.overlay },
    recorder: { ...DEFAULTS.recorder, ...saved?.recorder },
  };
  // reprodução é temporária: ao abrir o app, volta para o jogo ao vivo
  if (settings.overlay.source === 'replay') settings.overlay.source = 'ws';
  // módulos novos começam ligados para quem já tinha configurações salvas.
  // Atenção: ler do arquivo salvo, não do objeto já misturado com os padrões.
  if (saved?.overlay) {
    const known = new Set(Array.isArray(saved.overlay.knownModules) ? saved.overlay.knownModules : LEGACY_MODULES);
    const added = DEFAULT_MODULES.filter((m) => !known.has(m));
    if (added.length) {
      settings.overlay.modules = ALL_MODULES.filter((m) => settings.overlay.modules.includes(m) || added.includes(m));
    }
  }
  settings.overlay.knownModules = ALL_MODULES;
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
  else if (o.source === 'replay' && o.replayFile) {
    params.replayFile = o.replayFile;
    params.speed = String(o.replaySpeed);
  } else params.OVERLAY_WS = o.wsUrl;
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
  if (patch.source === 'replay' && recordingExists(patch.replayFile)) {
    next.source = 'replay';
    next.replayFile = patch.replayFile;
  }
  if (REPLAY_SPEEDS.includes(Number(patch.replaySpeed))) next.replaySpeed = Number(patch.replaySpeed);
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
    const reload =
      before.source !== next.source || before.wsUrl !== next.wsUrl || before.modules.join() !== next.modules.join() ||
      next.source === 'replay'; // pedir para reproduzir de novo recomeça do início
    if (reload) {
      // recarregar o overlay interrompe a gravação: fecha o arquivo antes
      if (recording) finalizeRecording({ incomplete: true });
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

/* ---------------- gravações ---------------- */

/**
 * O overlay é quem recebe os eventos do ACT; o processo principal cuida do arquivo.
 * O overlay manda pedaços a cada 2 s (recorder:append) e um resumo no fim (recorder:finish).
 */
/** @type {{ name: string, file: string, startedAt: number, events: number, durationMs: number, stopping?: boolean } | null} */
let recording = null;

const recordingsDir = () =>
  SELFTEST ? join(app.getPath('temp'), 'aetherguide-selftest-recordings') : join(app.getPath('documents'), 'Aetherguide', 'Gravacoes');

function recordingPath(name) {
  if (typeof name !== 'string' || name !== basename(name) || !name.endsWith('.agrec')) throw new Error('Nome de gravação inválido.');
  return join(recordingsDir(), name);
}

function recordingExists(name) {
  try {
    return existsSync(recordingPath(name));
  } catch {
    return false;
  }
}

function stamp(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
}

function recorderStatus() {
  return recording
    ? { recording: true, name: recording.name, startedAt: recording.startedAt, events: recording.events, durationMs: recording.durationMs }
    : { recording: false, name: null, startedAt: null, events: 0, durationMs: 0 };
}

function broadcast(channel, payload) {
  for (const w of BrowserWindow.getAllWindows()) w.webContents.send(channel, payload);
}

function startRecording() {
  if (recording) return { ok: true };
  if (settings.overlay.source !== 'ws') {
    return { ok: false, error: 'A gravação só funciona com a fonte "ACT ou IINACT" (não em demonstração nem durante uma reprodução).' };
  }
  if (!overlayWin) return { ok: false, error: 'O overlay não está aberto.' };
  mkdirSync(recordingsDir(), { recursive: true });
  const name = `Sessao_${stamp()}.agrec`;
  const file = recordingPath(name);
  const header = { format: 'aetherguide-recording', version: 1, app: app.getVersion(), startedAt: new Date().toISOString(), source: settings.overlay.wsUrl };
  writeFileSync(file, `${JSON.stringify(header)}\n`);
  recording = { name, file, startedAt: Date.now(), events: 0, durationMs: 0 };
  overlayWin.webContents.send('recorder:command', { cmd: 'start', includePrivateChat: settings.recorder.includePrivateChat });
  broadcast('recorder:status', recorderStatus());
  broadcast('recordings:changed');
  refreshTrayMenu();
  return { ok: true };
}

function stopRecording() {
  if (!recording || recording.stopping) return { ok: true };
  recording.stopping = true;
  overlayWin?.webContents.send('recorder:command', { cmd: 'stop' });
  // se o overlay não responder, fecha o arquivo mesmo assim
  const current = recording;
  setTimeout(() => {
    if (recording === current) finalizeRecording({ incomplete: true });
  }, 5000);
  return { ok: true };
}

const toggleRecording = () => (recording ? stopRecording() : startRecording());

function finalizeRecording(summary) {
  if (!recording) return;
  const footer = {
    events: recording.events,
    durationMs: Date.now() - recording.startedAt,
    ...summary,
  };
  try {
    appendFileSync(recording.file, `${JSON.stringify({ footer })}\n`);
  } catch (e) {
    console.error('Falha ao fechar a gravação:', e);
  }
  recording = null;
  broadcast('recorder:status', recorderStatus());
  broadcast('recordings:changed');
  refreshTrayMenu();
}

/** Aceita só os campos esperados do resumo enviado pelo overlay. */
function sanitizeSummary(s) {
  const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const counts = {};
  if (s && typeof s.typeCounts === 'object') {
    for (const [k, v] of Object.entries(s.typeCounts).slice(0, 200)) counts[String(k).slice(0, 40)] = num(v);
  }
  return {
    events: num(s?.events),
    durationMs: num(s?.durationMs),
    player: typeof s?.player === 'string' ? s.player.slice(0, 60) : null,
    zones: Array.isArray(s?.zones) ? s.zones.filter((z) => typeof z === 'string').slice(0, 50) : [],
    typeCounts: counts,
  };
}

function readEdgeLine(file, size, fromEnd) {
  const len = Math.min(size, 65536);
  const buf = Buffer.alloc(len);
  const fd = openSync(file, 'r');
  try {
    readSync(fd, buf, 0, len, fromEnd ? size - len : 0);
  } finally {
    closeSync(fd);
  }
  const lines = buf.toString('utf8').trim().split('\n');
  try {
    return JSON.parse(fromEnd ? lines[lines.length - 1] : lines[0]);
  } catch {
    return null;
  }
}

function listRecordings() {
  const dir = recordingsDir();
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.agrec'))
    .map((name) => {
      const file = join(dir, name);
      const st = statSync(file);
      const header = readEdgeLine(file, st.size, false);
      const last = readEdgeLine(file, st.size, true);
      const footer = last && !Array.isArray(last) && last.footer ? last.footer : null;
      const active = recording?.name === name;
      return {
        name,
        bytes: st.size,
        modified: st.mtimeMs,
        startedAt: header?.startedAt ?? null,
        durationMs: footer?.durationMs ?? (active ? Date.now() - recording.startedAt : null),
        events: footer?.events ?? (active ? recording.events : null),
        player: footer?.player ?? null,
        zones: footer?.zones ?? [],
        incomplete: !footer && !active,
      };
    })
    .sort((a, b) => b.modified - a.modified);
}

/* ---------------- bandeja e atalhos ---------------- */

const mmss = (ms) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;

function refreshTrayMenu() {
  if (!tray) return;
  const o = settings.overlay;
  tray.setToolTip(recording ? `Aetherguide — gravando (${mmss(Date.now() - recording.startedAt)})` : 'Aetherguide');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Abrir Aetherguide', click: showMain },
    { type: 'separator' },
    { label: 'Mostrar overlay', type: 'checkbox', checked: o.visible, accelerator: SHORTCUTS.toggle, click: () => updateOverlay({ visible: !o.visible }) },
    { label: 'Travar overlay (cliques passam para o jogo)', type: 'checkbox', checked: o.locked, accelerator: SHORTCUTS.lock, click: () => updateOverlay({ locked: !o.locked }) },
    {
      label: recording ? '■ Parar gravação' : '● Gravar sessão',
      accelerator: SHORTCUTS.record,
      enabled: !!recording || o.source === 'ws',
      click: toggleRecording,
    },
    { label: 'Abrir pasta de gravações', click: openRecordingsFolder },
    { type: 'separator' },
    ...(o.source === 'replay' ? [{ label: 'Voltar ao jogo ao vivo', click: () => updateOverlay({ source: 'ws' }) }] : []),
    { label: 'Modo demonstração', type: 'checkbox', checked: o.source === 'demo', click: () => updateOverlay({ source: o.source === 'demo' ? 'ws' : 'demo' }) },
    { label: 'Voltar overlay para a posição padrão', click: () => updateOverlay({ resetPosition: true }) },
    { type: 'separator' },
    { label: 'Sair', click: () => { quitting = true; app.quit(); } },
  ]));
}

function openRecordingsFolder() {
  mkdirSync(recordingsDir(), { recursive: true });
  return shell.openPath(recordingsDir());
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
    record: globalShortcut.register(SHORTCUTS.record, () => {
      const r = toggleRecording();
      if (!r.ok && tray) tray.displayBalloon({ title: 'Não foi possível gravar', content: r.error, iconType: 'warning' });
    }),
  };
  for (const [name, registered] of Object.entries(ok)) {
    if (!registered) console.warn(`Atalho ${SHORTCUTS[name]} já está em uso por outro programa.`);
  }
  return ok;
}

/* ---------------- IPC ---------------- */

ipcMain.handle('settings:get', () => settings);
ipcMain.handle('overlay:set', (_e, patch) => updateOverlay(patch && typeof patch === 'object' ? patch : {}));

// gravações — chamadas pela janela principal
ipcMain.handle('recorder:toggle', () => toggleRecording());
ipcMain.handle('recorder:get', () => recorderStatus());
ipcMain.handle('recorder:options', (_e, opts) => {
  settings.recorder.includePrivateChat = !!opts?.includePrivateChat;
  saveSettings();
  broadcast('settings:changed', settings);
  return settings;
});
ipcMain.handle('recordings:list', () => listRecordings());
ipcMain.handle('recordings:delete', (_e, name) => {
  if (recording?.name === name) throw new Error('Pare a gravação antes de excluir.');
  unlinkSync(recordingPath(name));
  broadcast('recordings:changed');
});
ipcMain.handle('recordings:open-folder', () => openRecordingsFolder());
ipcMain.handle('recordings:play', (_e, name, speed) =>
  updateOverlay({ source: 'replay', replayFile: name, replaySpeed: speed, visible: true }));
ipcMain.handle('recordings:read', (_e, name) => readFileSync(recordingPath(name), 'utf8'));

// gravações — chamadas só pela janela de overlay
const fromOverlay = (e) => !!overlayWin && e.sender === overlayWin.webContents;
ipcMain.handle('recorder:append', (e, chunk) => {
  if (!recording || !fromOverlay(e) || typeof chunk !== 'string') return false;
  appendFileSync(recording.file, chunk);
  return true;
});
ipcMain.on('recorder:status', (e, s) => {
  if (!recording || !fromOverlay(e)) return;
  recording.events = Number(s?.events) || 0;
  recording.durationMs = Number(s?.durationMs) || 0;
  broadcast('recorder:status', recorderStatus());
  tray?.setToolTip(`Aetherguide — gravando (${mmss(recording.durationMs)})`);
});
ipcMain.handle('recorder:finish', (e, summary) => {
  if (fromOverlay(e)) finalizeRecording(sanitizeSummary(summary));
});

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

  // SELFTEST_RECORD=1: grava ~6 s do simulador de ACT, confere o arquivo e reproduz em 4x
  if (process.env.SELFTEST_RECORD) {
    const overlayText = () => overlayWin.webContents.executeJavaScript(`document.querySelector('.ov-panel')?.innerText.slice(0, 260)`);
    report.record = { start: startRecording() };
    await wait(10000);
    report.record.indicator = await overlayText();
    stopRecording();
    for (let i = 0; i < 40 && recording; i++) await wait(250);
    const list = listRecordings();
    report.record.list = list.slice(0, 1);
    if (list[0]) {
      const lines = readFileSync(recordingPath(list[0].name), 'utf8').trim().split('\n');
      report.record.file = {
        lines: lines.length,
        hasHeader: lines[0].includes('aetherguide-recording'),
        hasFooter: lines[lines.length - 1].startsWith('{"footer"'),
        hpLines39: lines.filter((l) => l.includes('"line":["39"')).length,
        abilityLines21: lines.filter((l) => l.includes('"line":["21"')).length,
        combatants: lines.filter((l) => l.includes('__combatants')).length,
        hasRawLine: lines.some((l) => l.includes('"rawLine"')),
        // a "foto" do contexto deve estar no começo do arquivo (t = 0)
        firstEvents: lines.slice(1, 6).map((l) => {
          const [t, e] = JSON.parse(l);
          return `${t} ${e.type}${e.line ? `:${e.line[0]}` : ''}`;
        }),
      };
      updateOverlay({ source: 'replay', replayFile: list[0].name, replaySpeed: 2 });
      await wait(3000);
      report.shots.replay = await capture(overlayWin, 'overlay-reproducao');
      report.record.replayText = await overlayText();
      await mainWin.webContents.executeJavaScript(`document.querySelector('[data-recordings-panel]')?.scrollIntoView()`);
      await wait(500);
      report.shots.recordingsPanel = await capture(mainWin, 'main-gravacoes');
    }
  }

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
  app.on('before-quit', () => {
    quitting = true;
    // o arquivo já está quase todo salvo (escrita a cada 2 s); só falta o rodapé
    if (recording) finalizeRecording({ incomplete: true });
  });
  app.on('will-quit', () => globalShortcut.unregisterAll());

  app.whenReady().then(() => {
    loadSettings();
    if (SELFTEST) {
      const source = process.env.SELFTEST_SOURCE === 'ws' ? 'ws' : 'demo';
      settings.overlay = { ...settings.overlay, source, visible: true, locked: false };
      if (process.env.SELFTEST_WS) settings.overlay.wsUrl = process.env.SELFTEST_WS;
    }
    registerAppProtocol();
    createTray();
    createMainWindow(SELFTEST ? '#/overlay' : '');
    createOverlay();
    const shortcuts = registerShortcuts();
    if (SELFTEST) selftest(shortcuts);
  });
}
