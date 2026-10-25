let ADDRESS = '';
const API = 'https://reset.openmayhem.ai';
const POLL_MS = 15000;
const COIN = 1e8; // RESET 8 位小数

const whale = document.getElementById('whale');
const bubble = document.getElementById('bubble');
const badge = document.getElementById('balance-badge');

// —— 多语言（与 main 的 locale 同步）——
let locale = 'zh';

function tr(key, ...args) {
  const dict = (window.I18N && (window.I18N[locale] || window.I18N.zh)) || {};
  const s = dict[key] != null ? dict[key] : key;
  return String(s).replace(/\{(\d+)\}/g, (m, i) => (args[i] != null ? args[i] : m));
}

let prevBalance = null;
let prevStrikes = null;
let prevVein = null;
let bubbleTimer = null;
let latest = null;
let agentRunning = null; // true=挖矿中 false=已停 null=未知
let suppressAgentSay = false; // 双击手动切换时抑制重复气泡

let currentSkin = 'steve';
let currentState = 'idle';
let animTimer = null;
let animFrame = 0;

// ---- 皮肤定义 ----
// 新增皮肤：在 SKINS 里加一行 framesSkin('名字', 'assets下的文件夹名')，
// 并在 main.js 的 SKIN_LIST 里同步加一项。
function framesSkin(name, folder) {
  return {
    name,
    type: 'frames',
    frameCounts: { idle: 6, mining: 6, excited: 5, happy: 4, sad: 8 },
    durations: { idle: 1100, mining: 820, excited: 840, happy: 700, sad: 1220 },
    frames(state) {
      const n = this.frameCounts[state];
      return Array.from({ length: n }, (_, i) => `assets/${folder}/${state}_${i}.png`);
    },
  };
}

const SKINS = {
  steve: framesSkin('Steve', 'steve'),
  goku: framesSkin('Goku', 'goku'),
};

function stopAnim() {
  if (animTimer) { clearInterval(animTimer); animTimer = null; }
}

function setState(state) {
  currentState = state;
  const skin = SKINS[currentSkin];
  whale.className = state;
  if (skin.type === 'single') {
    stopAnim();
    whale.src = skin.images[state];
  } else {
    const frames = skin.frames(state);
    const interval = skin.durations[state] / frames.length;
    stopAnim();
    animFrame = 0;
    whale.src = frames[0];
    animTimer = setInterval(() => {
      animFrame = (animFrame + 1) % frames.length;
      whale.src = frames[animFrame];
    }, interval);
  }
}

function say(text, ms = 3500) {
  bubble.textContent = text;
  bubble.classList.remove('hidden');
  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => bubble.classList.add('hidden'), ms);
}

function switchSkin(key) {
  if (!SKINS[key]) return;
  currentSkin = key;
  setState(currentState);
  say(tr('say.skin', SKINS[key].name), 2000);
}

function refreshBadge() {
  if (!latest) return;
  badge.textContent = tr('badge.balance', fmt(latest.balance)) + '\n' + tr('badge.deposit', fmt(latest.deposit));
}

// 语言切换：刷新所有可见文案
function applyLocale(next) {
  if (next !== 'zh' && next !== 'en') return;
  locale = next;
  document.title = 'reset-pet:' + locale; // 便于用窗口标题核对当前语言
  refreshStatusLabel();
  refreshBadge();
}

function fmt(n) {
  return (isFinite(n) ? n : 0).toFixed(4);
}

function refreshStatusLabel() {
  const el = document.getElementById('agent-status');
  if (!el) return;
  if (agentRunning === true) {
    el.textContent = tr('status.mining');
    el.className = 'running';
  } else if (agentRunning === false) {
    el.textContent = tr('status.stopped');
    el.className = 'stopped';
  } else {
    el.textContent = tr('status.unknown');
    el.className = 'unknown';
  }
}

function updateAgentStatus(running) {
  const prev = agentRunning;
  const changed = prev !== running;
  agentRunning = running;
  refreshStatusLabel();
  if (!changed) return;
  if (running === false) {
    setState('sad');
    if (prev !== null && !suppressAgentSay) say(tr('say.agentDown'), 6000);
  } else if (running === true) {
    setState(depositState());
    if (prev !== null && !suppressAgentSay) say(tr('say.agentUp'), 2500);
  }
}

function depositState() {
  return latest && latest.deposit > 0 ? 'mining' : 'idle';
}

async function poll() {
  try {
    const [accRes, stateRes] = await Promise.all([
      fetch(`${API}/v1/account/${ADDRESS}`),
      fetch(`${API}/v1/state`),
    ]);
    const account = await accRes.json();
    const state = await stateRes.json();

    const balance = Number(account.balance || '0') / COIN;
    const deposit = Number(account.deposit || '0') / COIN;
    const strikes = account.mine?.strikes ?? 0;
    const fairShare = Number(account.mine?.fair_share_estimate || '0') / COIN;
    const vein = Number(state.mine?.vein_buffer || '0') / COIN;
    const windowOpen = state.mine?.window_open === true;

    latest = { balance, deposit, strikes, fairShare, vein, windowOpen };

    badge.textContent = tr('badge.balance', fmt(balance)) + '\n' + tr('badge.deposit', fmt(deposit));

    if (agentRunning === false) {
      setState('sad');
    } else if (prevBalance === null) {
      setState(depositState());
    } else if (balance > prevBalance) {
      setState('happy');
      say(tr('say.mined', fmt(balance - prevBalance)));
    } else if (strikes > prevStrikes) {
      setState('sad');
      say(tr('say.penalty'));
    } else if (vein > prevVein) {
      setState('excited');
      say(tr('say.vein'));
    } else if (deposit > 0) {
      setState('mining');
    } else {
      setState('idle');
    }

    prevBalance = balance;
    prevStrikes = strikes;
    prevVein = vein;
  } catch (_e) {
    // 网络抖动，保持现状
  }
}

function showDetail() {
  if (!latest) return;
  const d = latest;
  const lines = [
    agentRunning === true ? tr('detail.agentOnline') : agentRunning === false ? tr('detail.agentOffline') : tr('detail.agentChecking'),
    tr('detail.balance', fmt(d.balance)),
    tr('detail.deposit', fmt(d.deposit)),
    tr('detail.fairShare', fmt(d.fairShare)),
    tr('detail.strikes', d.strikes),
    d.windowOpen ? tr('detail.windowOpen') : tr('detail.windowClosed'),
    tr('detail.vein', fmt(d.vein)),
  ];
  say(lines.join('\n'), 5000);
}

// ---- 拖动 + 点击（戳一下看详情） ----
let dragging = false;
let moved = false;
let startX = 0;
let startY = 0;
let clickTimer = null;

document.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  dragging = true;
  moved = false;
  startX = e.screenX;
  startY = e.screenY;
});

document.addEventListener('mousemove', (e) => {
  if (!dragging) return;
  const dx = e.screenX - startX;
  const dy = e.screenY - startY;
  if (!moved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) moved = true;
  if (moved) {
    window.petAPI.moveWindow(dx, dy);
    startX = e.screenX;
    startY = e.screenY;
  }
});

document.addEventListener('mouseup', (e) => {
  if (dragging && !moved && e.target === whale) {
    if (clickTimer) {
      // 第二次点击 → 双击：启停挖矿
      clearTimeout(clickTimer);
      clickTimer = null;
      onDoubleClick();
    } else {
      // 等 260ms 看有没有第二下
      clickTimer = setTimeout(() => {
        clickTimer = null;
        setState('happy');
        showDetail();
        setTimeout(poll, 2500);
      }, 260);
    }
  }
  dragging = false;
  moved = false;
});

// 双击宠物 = 开/关挖矿 agent
async function onDoubleClick() {
  if (!window.petAPI || !window.petAPI.toggleAgent) return;
  suppressAgentSay = true;
  setTimeout(() => { suppressAgentSay = false; }, 4000);
  say(tr('say.toggling'), 1500);
  try {
    const res = await window.petAPI.toggleAgent();
    if (res && res.msg) say(res.msg, 3000);
    else say(tr('say.done'), 2500);
  } catch (err) {
    say(tr('say.fail', err && err.message ? err.message : err), 4000);
  }
  setTimeout(poll, 3000);
}

document.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  window.petAPI.showMenu();
});

// 皮肤切换（IPC 触发）
if (window.petAPI && window.petAPI.onSwitchSkin) {
  window.petAPI.onSwitchSkin((key) => switchSkin(key));
}

// agent 存活状态（IPC 触发）
if (window.petAPI && window.petAPI.onAgentStatus) {
  window.petAPI.onAgentStatus((running) => updateAgentStatus(running));
}

// 语言（IPC 触发 + 启动时同步）
if (window.petAPI && window.petAPI.onSetLocale) {
  window.petAPI.onSetLocale((loc) => applyLocale(loc));
}
if (window.petAPI && window.petAPI.getLocale) {
  window.petAPI.getLocale().then((loc) => applyLocale(loc)).catch(() => {});
}

async function init() {
  try {
    const cfg = await window.petAPI.getConfig();
    if (cfg && cfg.walletAddress) ADDRESS = cfg.walletAddress;
  } catch (_e) {}
  setInterval(poll, POLL_MS);
  poll();
}
init();
