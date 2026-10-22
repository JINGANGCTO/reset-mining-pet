const { app, BrowserWindow, ipcMain, screen, Menu, shell } = require('electron');
const { exec, execSync, spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

let win = null;

// 皮肤列表（与 renderer.js 的 SKINS 同步；新增皮肤时两处都加）
const SKIN_LIST = [
  { key: 'steve', label: 'Steve' },
  { key: 'goku', label: 'Goku' },
];

// —— 读取配置（config.json）——
const CONFIG_PATH = path.join(__dirname, 'config.json');
let config = { walletAddress: '', nodePath: 'node', signerDir: '..\\reset\\signer' };
try { config = { ...config, ...JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) }; } catch {}
const NODE = config.nodePath || 'node';

ipcMain.handle('get-config', () => config);

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
  const menu = Menu.buildFromTemplate([
    { label: '切换皮肤', submenu: SKIN_LIST.map(s => ({ label: s.label, click: () => win.webContents.send('switch-skin', s.key) })) },
    { label: '打开 RESET 面板', click: () => shell.openExternal('http://127.0.0.1:4747') },
    { label: '复制钱包地址', click: () => { const { clipboard } = require('electron'); clipboard.writeText(config.walletAddress || ''); } },
    { type: 'separator' },
    { label: '退出宠物（停止挖矿）', click: () => app.quit() },
  ]);
  menu.popup({ window: win });
});

ipcMain.on('open-dashboard', () => shell.openExternal('http://127.0.0.1:4747'));

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

function startDashboard() {
  const signerDir = path.resolve(__dirname, config.signerDir);
  const child = spawn(NODE, ['bin/reset-signer.mjs', 'dashboard'], {
    cwd: signerDir,
    stdio: 'ignore',
    windowsHide: true,
  });
  child.unref();
}

function startAgent() {
  if (agentCount() > 0) return; // 已在运行，不重复启动
  const password = readSecret('.password');
  const key = readSecret('.deepseek-key');
  if (!password || !key) return;
  const signerDir = path.resolve(__dirname, config.signerDir);
  const child = spawn(NODE, [
    'bin/reset-signer.mjs', 'agent', '--role', 'mine',
    '--provider', 'openai', '--base-url', 'https://api.deepseek.com',
    '--model', 'deepseek-flash', '--api-key-env', 'DEEPSEEK_API_KEY',
  ], {
    cwd: signerDir,
    env: { ...process.env, RESET_SIGNER_PASSWORD: password, DEEPSEEK_API_KEY: key },
    stdio: 'ignore',
    windowsHide: true,
  });
  child.unref();
}

function stopAgent() {
  try {
    execSync(`powershell.exe -NoProfile -File "${path.join(__dirname, 'kill-agent.ps1')}"`, { timeout: 8000 });
  } catch {}
}

app.whenReady().then(() => {
  createWindow();
  startAgent();
  startDashboard();
  checkAgent();
});
app.on('before-quit', () => stopAgent());
app.on('window-all-closed', () => app.quit());
