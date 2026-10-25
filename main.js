const { app, BrowserWindow, ipcMain, screen, Menu, shell, Tray, globalShortcut, nativeImage } = require('electron');
const { exec, execSync, spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

let win = null;

// —— 配置（config.json，安装时由 setup.js 自动生成）——
const CONFIG_PATH = path.join(__dirname, 'config.json');
let config = { walletAddress: '', nodePath: 'node', signerDir: '..\\reset\\signer' };
try { config = { ...config, ...JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) }; } catch {}
const NODE = config.nodePath || 'node';
const signerDir = () => path.resolve(__dirname, config.signerDir || '..\\reset\\signer');

ipcMain.handle('get-config', () => config);

// —— 多语言（中/英）——
const I18N = require('./i18n.js');
let locale = 'zh';

function t(key, ...args) {
  const d = I18N[locale] || I18N.zh;
  const s = d[key] != null ? d[key] : (I18N.zh[key] != null ? I18N.zh[key] : key);
  return String(s).replace(/\{(\d+)\}/g, (m, i) => (args[i] != null ? args[i] : m));
}

function settingsFile() {
  return path.join(app.getPath('userData'), 'settings.json');
}

function loadSettings() {
  try {
    const s = JSON.parse(fs.readFileSync(settingsFile(), 'utf8'));
    if (s.locale === 'en' || s.locale === 'zh') locale = s.locale;
  } catch {}
}

function saveSettings() {
  try { fs.writeFileSync(settingsFile(), JSON.stringify({ locale }, null, 2)); } catch {}
}

function setLocale(next) {
  if (next !== 'zh' && next !== 'en' || next === locale) return;
  locale = next;
  saveSettings();
  log('locale =', locale);
  if (win && !win.isDestroyed()) win.webContents.send('set-locale', locale);
  updateTrayTooltip();
}

function langSubmenu() {
  return [
    { label: '中文', type: 'radio', checked: locale === 'zh', click: () => setLocale('zh') },
    { label: 'English', type: 'radio', checked: locale === 'en', click: () => setLocale('en') },
  ];
}

// 皮肤列表（与 renderer.js 的 SKINS 同步；新增皮肤时两处都加）
const SKIN_LIST = [
  { key: 'steve', label: 'Steve' },
  { key: 'goku', label: 'Goku' },
];

function createWindow() {
  const { workArea } = screen.getPrimaryDisplay();
  const w = 260, h = 420;
  win = new BrowserWindow({
    width: w,
    height: h,
    x: workArea.x + workArea.width - w - 20,
    y: workArea.y + workArea.height - h - 20,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    fullscreenable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.loadFile('index.html');
}

// 拖动窗口
ipcMain.on('move-window', (_e, { dx, dy }) => {
  if (!win) return;
  const [x, y] = win.getPosition();
  win.setPosition(Math.round(x + dx), Math.round(y + dy));
});

// 右键菜单
ipcMain.on('show-menu', () => {
  const running = agentRunning === true;
  const menu = Menu.buildFromTemplate([
    { label: running ? t('menu.stopMining') : t('menu.startMining'), click: () => toggleAgent('menu') },
    { label: t('menu.hide'), click: () => toggleHide('menu') },
    { type: 'separator' },
    { label: t('menu.skin'), submenu: SKIN_LIST.map(s => ({ label: s.label, click: () => win.webContents.send('switch-skin', s.key) })) },
    { label: t('menu.lang'), submenu: langSubmenu() },
    { label: t('menu.dashboard'), click: () => shell.openExternal('http://127.0.0.1:4747') },
    { label: t('menu.copyAddr'), click: () => { const { clipboard } = require('electron'); clipboard.writeText(config.walletAddress || ''); } },
    { type: 'separator' },
    { label: t('menu.quit'), click: () => app.quit() },
  ]);
  menu.popup({ window: win });
});

ipcMain.on('open-dashboard', () => shell.openExternal('http://127.0.0.1:4747'));
ipcMain.handle('get-locale', () => locale);

// —— 本地挖矿 agent 存活检测 ——
let agentRunning = null;

function checkAgent() {
  const script = path.join(__dirname, 'check-agent.ps1');
  exec(`powershell.exe -NoProfile -File "${script}"`, { timeout: 8000 }, (err, stdout) => {
    if (!win || win.isDestroyed()) return;
    if (err) return; // 检测失败保持上次状态，不误报
    const n = parseInt((stdout || '').trim(), 10);
    const running = Number.isFinite(n) && n > 0;
    agentRunning = running;
    win.webContents.send('agent-status', running);
  });
}

setInterval(checkAgent, 15000);

// —— 挖矿 agent 生命周期（桌宠 = 开关）——

function readSecret(name) {
  try {
    return fs.readFileSync(path.join(os.homedir(), '.reset-signer', name), 'utf8')
      .replace(/^\ufeff/, '').replace(/\r?\n$/, '').trim();
  } catch { return ''; }
}

function agentCount() {
  try {
    return parseInt(execSync(`powershell.exe -NoProfile -File "${path.join(__dirname, 'check-agent.ps1')}"`, { timeout: 8000 }).toString().trim(), 10) || 0;
  } catch { return 0; }
}

function dashboardCount() {
  try {
    return parseInt(execSync(`powershell.exe -NoProfile -File "${path.join(__dirname, 'check-dashboard.ps1')}"`, { timeout: 8000 }).toString().trim(), 10) || 0;
  } catch { return 0; }
}

function startDashboard() {
  if (dashboardCount() > 0) return; // 已经在跑，别开第二个
  const child = spawn(NODE, ['bin/reset-signer.mjs', 'dashboard'], {
    cwd: signerDir(),
    stdio: 'ignore',
    windowsHide: true,
  });
  child.unref();
}

function startAgent() {
  if (agentCount() > 0) return { ok: true, running: true, msg: t('agent.already') }; // 已在运行，不重复启动
  const password = readSecret('.password');
  const key = readSecret('.deepseek-key');
  if (!password || !key) return { ok: false, running: false, msg: t('agent.missing') };
  const child = spawn(NODE, [
    'bin/reset-signer.mjs', 'agent', '--role', 'mine',
    '--provider', 'openai', '--base-url', 'https://api.deepseek.com',
    '--model', 'deepseek-flash', '--api-key-env', 'DEEPSEEK_API_KEY',
  ], {
    cwd: signerDir(),
    env: { ...process.env, RESET_SIGNER_PASSWORD: password, DEEPSEEK_API_KEY: key },
    stdio: 'ignore',
    windowsHide: true,
  });
  child.unref();
  return { ok: true, running: true, msg: t('agent.started') };
}

function stopAgent(all = false) {
  try {
    const flag = all ? ' -All' : '';
    execSync(`powershell.exe -NoProfile -File "${path.join(__dirname, 'kill-agent.ps1')}"${flag}`, { timeout: 8000 });
    return { ok: true, running: false, msg: all ? t('agent.stoppedAll') : t('agent.stopped') };
  } catch (e) {
    return { ok: false, running: agentCount() > 0, msg: t('agent.stopFailed', e.message) };
  }
}

// 双击宠物 / 右键菜单 → 启停挖矿
const LOG = path.join(app.getPath('userData'), 'pet.log');
function log(...args) {
  try { fs.appendFileSync(LOG, `[${new Date().toISOString()}] ${args.join(' ')}\n`); } catch {}
}

function toggleAgent(src = '?') {
  const running = agentCount() > 0;
  log('toggle from', src, 'running=', running);
  const res = running ? stopAgent() : startAgent();
  log('toggle result', JSON.stringify(res));
  // 启动后等 2.5s 复核一次真实进程数，防止 spawn 后立刻崩溃
  setTimeout(() => {
    const now = agentCount() > 0;
    log('recheck running=', now);
    agentRunning = now;
    if (win && !win.isDestroyed()) win.webContents.send('agent-status', now);
  }, 2500);
  return res;
}

ipcMain.handle('toggle-agent', () => toggleAgent('ipc'));

// ══════════ 隐身（打游戏时一键消失，挖矿照跑）══════════
const HIDE_HOTKEY = 'Control+Alt+H';
let tray = null;
let autoHideForGame = true;   // 检测到全屏游戏自动隐身
let hiddenByHotkey = false;   // 快捷键/菜单主动隐藏
let hiddenByGame = false;     // 因游戏自动隐藏
let gameProc = '';
let shownHideTip = false;

function petVisible() {
  return !!(win && !win.isDestroyed() && win.isVisible());
}

function updateTrayTooltip() {
  if (!tray) return;
  if (petVisible()) tray.setToolTip(t('tooltip.visible'));
  else tray.setToolTip(t('tooltip.hidden', gameProc ? t('tooltip.playing', gameProc) : ''));
}

function hidePet(why) {
  if (!petVisible()) return;
  win.hide();
  log('hide pet:', why);
  updateTrayTooltip();
  if (tray && !shownHideTip) {
    shownHideTip = true;
    try { tray.displayBalloon({ title: t('balloon.title'), content: t('balloon.body') }); } catch {}
  }
}

function showPet(why) {
  if (!win || win.isDestroyed()) return;
  win.show();
  win.setAlwaysOnTop(true, 'screen-saver');
  log('show pet:', why);
  updateTrayTooltip();
  if (win.webContents) win.webContents.send('agent-status', agentRunning === true);
}

function toggleHide(src = '?') {
  if (petVisible()) {
    hiddenByHotkey = true;
    hidePet(src);
  } else {
    hiddenByHotkey = false;
    hiddenByGame = false;
    showPet(src);
  }
}

function buildTrayMenu() {
  return Menu.buildFromTemplate([
    { label: t('tray.showHide'), click: () => toggleHide('tray') },
    {
      label: t('tray.autoHide'), type: 'checkbox', checked: autoHideForGame,
      click: (item) => {
        autoHideForGame = item.checked;
        log('autoHideForGame=', autoHideForGame);
        if (!autoHideForGame && hiddenByGame) { hiddenByGame = false; showPet('auto-off'); }
      },
    },
    { label: t('menu.lang'), submenu: langSubmenu() },
    { type: 'separator' },
    { label: t('tray.dashboard'), click: () => shell.openExternal('http://127.0.0.1:4747') },
    { type: 'separator' },
    { label: t('tray.quit'), click: () => app.quit() },
  ]);
}

function initTray() {
  try {
    const iconPath = path.join(__dirname, 'assets', 'steve', 'idle_0.png');
    const img = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
    tray = new Tray(img);
    tray.setToolTip(t('tooltip.visible'));
    tray.on('click', () => toggleHide('tray-click'));
    tray.on('right-click', () => tray.popUpContextMenu(buildTrayMenu()));
    updateTrayTooltip();
  } catch (e) {
    log('tray init failed:', e.message);
  }
}

function registerHotkey() {
  try {
    const ok = globalShortcut.register(HIDE_HOTKEY, () => toggleHide('hotkey'));
    log('hotkey', HIDE_HOTKEY, ok ? 'registered' : 'FAILED (可能被占用)');
  } catch (e) {
    log('hotkey error:', e.message);
  }
}

// 前台出现全屏应用（游戏）→ 自动隐身；退出游戏自动回来
function checkFullscreen() {
  if (!autoHideForGame) return;
  exec(`powershell.exe -NoProfile -File "${path.join(__dirname, 'check-fullscreen.ps1')}"`, { timeout: 6000 }, (err, stdout) => {
    if (err) return;
    const out = (stdout || '').trim();
    if (out.startsWith('game:')) {
      const name = out.slice(5);
      if (name !== gameProc) log('fullscreen game detected:', name);
      gameProc = name;
      if (!hiddenByHotkey && petVisible()) {
        hiddenByGame = true;
        hidePet('game:' + gameProc);
      }
    } else {
      if (gameProc) log('fullscreen game ended:', gameProc);
      gameProc = '';
      if (hiddenByGame) { hiddenByGame = false; showPet('game-end'); }
    }
    updateTrayTooltip();
  });
}

app.whenReady().then(() => {
  loadSettings();
  createWindow();
  startAgent();
  startDashboard();
  checkAgent();
  initTray();
  registerHotkey();
  checkFullscreen();
  setInterval(checkFullscreen, 5000);
});
app.on('before-quit', () => { globalShortcut.unregisterAll(); if (tray) { try { tray.destroy(); } catch {} } stopAgent(true); });
app.on('window-all-closed', () => app.quit());
