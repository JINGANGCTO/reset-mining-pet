let ADDRESS = '';
const API = 'https://reset.openmayhem.ai';
const POLL_MS = 15000;
const COIN = 1e8; // RESET 8 位小数

const whale = document.getElementById('whale');
const bubble = document.getElementById('bubble');
const badge = document.getElementById('balance-badge');

let prevBalance = null;
let prevStrikes = null;
let prevVein = null;
let bubbleTimer = null;
let latest = null;
let agentRunning = null; // true=挖矿中 false=已停 null=未知

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
  say(`换皮肤啦：${SKINS[key].name} ✨`, 2000);
}

function fmt(n) {
  return (isFinite(n) ? n : 0).toFixed(4);
}

function updateAgentStatus(running) {
  const prev = agentRunning;
  const changed = prev !== running;
  agentRunning = running;
  const el = document.getElementById('agent-status');
  if (el) {
    if (running === true) {
      el.textContent = '⛏ 挖矿中';
      el.className = 'running';
    } else if (running === false) {
      el.textContent = '⚠ 挖矿已停';
      el.className = 'stopped';
    } else {
      el.textContent = '…';
      el.className = 'unknown';
    }
  }
  if (!changed) return;
  if (running === false) {
    setState('sad');
    if (prev !== null) say('挖矿 agent 掉线了！双击 start-reset-miner.bat 启动 😢', 6000);
  } else if (running === true) {
    setState(depositState());
    if (prev !== null) say('挖矿 agent 上线了 ✓', 2500);
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

    badge.textContent = `余额 ${fmt(balance)} R\n锁仓 ${fmt(deposit)} R`;

    if (agentRunning === false) {
      setState('sad');
    } else if (prevBalance === null) {
      setState('idle');
    } else if (balance > prevBalance) {
      setState('happy');
      say(`挖到币了！ +${fmt(balance - prevBalance)} RESET 🎉`);
    } else if (strikes > prevStrikes) {
      setState('sad');
      say('被罚了……贪心果然不行 😢');
    } else if (vein > prevVein) {
      setState('excited');
      say('发现矿脉了！！⚡');
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
    `🤖 Agent ${agentRunning === true ? '在线挖矿中' : agentRunning === false ? '已停止！' : '检测中…'}`,
    `💰 余额 ${fmt(d.balance)} R`,
    `🔒 存款 ${fmt(d.deposit)} R`,
    `⚖️ 公平份额 ${fmt(d.fairShare)} R`,
    `⚠️ 惩罚 ${d.strikes} 次`,
    `⛏️ 挖矿窗口 ${d.windowOpen ? '开启' : '关闭'}`,
    `💎 矿脉 ${fmt(d.vein)} R`,
  ];
  say(lines.join('\n'), 5000);
}

// ---- 拖动 + 点击（戳一下看详情） ----
let dragging = false;
let moved = false;
let startX = 0;
let startY = 0;

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
    setState('happy');
    showDetail();
    setTimeout(poll, 2500);
  }
  dragging = false;
  moved = false;
});

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

async function init() {
  try {
    const cfg = await window.petAPI.getConfig();
    if (cfg && cfg.walletAddress) ADDRESS = cfg.walletAddress;
  } catch (_e) {}
  setInterval(poll, POLL_MS);
  poll();
}
init();
