// 中英文案表。main 用 require('./i18n.js')，renderer 用 <script> 拿 window.I18N
(function (root, factory) {
  const dict = factory();
  if (typeof module === 'object' && module.exports) module.exports = dict;
  else root.I18N = dict;
})(typeof self !== 'undefined' ? self : this, function () {
  return {
    zh: {
      'status.mining': '⛏ 挖矿中',
      'status.stopped': '⚠ 挖矿已停',
      'status.unknown': '…',

      'badge.balance': '余额 {0} R',
      'badge.deposit': '锁仓 {0} R',

      'detail.agentOnline': '🤖 Agent 在线挖矿中',
      'detail.agentOffline': '🤖 Agent 已停止！',
      'detail.agentChecking': '🤖 Agent 检测中…',
      'detail.balance': '💰 余额 {0} R',
      'detail.deposit': '🔒 存款 {0} R',
      'detail.fairShare': '⚖️ 公平份额 {0} R',
      'detail.strikes': '⚠️ 惩罚 {0} 次',
      'detail.windowOpen': '⛏️ 挖矿窗口 开启',
      'detail.windowClosed': '⛏️ 挖矿窗口 关闭',
      'detail.vein': '💎 矿脉 {0} R',

      'say.mined': '挖到币了！ +{0} RESET 🎉',
      'say.penalty': '被罚了……贪心果然不行 😢',
      'say.vein': '发现矿脉了！！⚡',
      'say.agentDown': '挖矿 agent 掉线了！双击我就能重新启动 😢',
      'say.agentUp': '挖矿 agent 上线了 ✓',
      'say.skin': '换皮肤啦：{0} ✨',
      'say.toggling': '…切换挖矿状态',
      'say.fail': '操作失败：{0}',
      'say.done': '操作完成',

      'menu.stopMining': '⏹ 停止挖矿',
      'menu.startMining': '▶ 启动挖矿',
      'menu.hide': '👻 隐身（Ctrl+Alt+H）',
      'menu.skin': '切换皮肤',
      'menu.lang': '🌐 语言 / Language',
      'menu.dashboard': '打开 RESET 面板',
      'menu.copyAddr': '复制钱包地址',
      'menu.quit': '退出宠物（停止挖矿）',

      'tray.showHide': '👁 显示 / 隐身 (Ctrl+Alt+H)',
      'tray.autoHide': '游戏中自动隐身',
      'tray.dashboard': '打开 RESET 面板',
      'tray.quit': '退出（停止挖矿）',

      'tooltip.visible': '桌宠：显示中 · Ctrl+Alt+H 隐身',
      'tooltip.hidden': '桌宠：已隐身{0} · 点托盘或 Ctrl+Alt+H 恢复',
      'tooltip.playing': '（游戏中：{0}）',
      'balloon.title': '桌宠已隐身',
      'balloon.body': '按 Ctrl+Alt+H 或点击托盘图标就能叫回来（挖矿继续跑）',

      'agent.already': '挖矿 agent 已在运行',
      'agent.missing': '缺少签名密码或 DeepSeek key（~/.reset-signer/）',
      'agent.started': '挖矿 agent 已启动 ⛏',
      'agent.stopped': '挖矿 agent 已停止',
      'agent.stoppedAll': '挖矿 agent 和面板都已停止',
      'agent.stopFailed': '停止失败：{0}',
    },

    en: {
      'status.mining': '⛏ Mining',
      'status.stopped': '⚠ Miner offline',
      'status.unknown': '…',

      'badge.balance': 'Balance {0} R',
      'badge.deposit': 'Locked {0} R',

      'detail.agentOnline': '🤖 Agent mining',
      'detail.agentOffline': '🤖 Agent stopped!',
      'detail.agentChecking': '🤖 Agent checking…',
      'detail.balance': '💰 Balance {0} R',
      'detail.deposit': '🔒 Deposit {0} R',
      'detail.fairShare': '⚖️ Fair share {0} R',
      'detail.strikes': '⚠️ Strikes {0}',
      'detail.windowOpen': '⛏️ Mining window open',
      'detail.windowClosed': '⛏️ Mining window closed',
      'detail.vein': '💎 Vein {0} R',

      'say.mined': 'Mined! +{0} RESET 🎉',
      'say.penalty': 'Penalized… greed never pays 😢',
      'say.vein': 'Vein found!! ⚡',
      'say.agentDown': 'Miner agent went offline! Double-click me to restart 😢',
      'say.agentUp': 'Miner agent is online ✓',
      'say.skin': 'Skin: {0} ✨',
      'say.toggling': '…toggling miner',
      'say.fail': 'Failed: {0}',
      'say.done': 'Done',

      'menu.stopMining': '⏹ Stop mining',
      'menu.startMining': '▶ Start mining',
      'menu.hide': '👻 Hide (Ctrl+Alt+H)',
      'menu.skin': 'Switch skin',
      'menu.lang': '🌐 Language / 语言',
      'menu.dashboard': 'Open RESET panel',
      'menu.copyAddr': 'Copy wallet address',
      'menu.quit': 'Quit (stop mining)',

      'tray.showHide': '👁 Show / Hide (Ctrl+Alt+H)',
      'tray.autoHide': 'Auto-hide during games',
      'tray.dashboard': 'Open RESET panel',
      'tray.quit': 'Quit (stop mining)',

      'tooltip.visible': 'Pet: visible · Ctrl+Alt+H to hide',
      'tooltip.hidden': 'Pet: hidden{0} · click tray or Ctrl+Alt+H',
      'tooltip.playing': ' (in game: {0})',
      'balloon.title': 'Pet hidden',
      'balloon.body': 'Press Ctrl+Alt+H or click the tray icon to bring it back (mining keeps running)',

      'agent.already': 'Miner agent already running',
      'agent.missing': 'Missing signer password or DeepSeek key (~/.reset-signer/)',
      'agent.started': 'Miner agent started ⛏',
      'agent.stopped': 'Miner agent stopped',
      'agent.stoppedAll': 'Miner agent and dashboard stopped',
      'agent.stopFailed': 'Stop failed: {0}',
    },
  };
});
