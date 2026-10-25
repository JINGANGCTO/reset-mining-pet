// 一键配置：自动检测钱包地址 → 写 config.json → 创建桌面快捷方式
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const home = os.homedir();
const petDir = __dirname;

function readSecret(name) {
  try {
    return fs.readFileSync(path.join(home, '.reset-signer', name), 'utf8')
      .replace(/^\ufeff/, '').replace(/\r?\n$/, '').trim();
  } catch { return ''; }
}

// 1. 确定 signer 目录：命令行参数 > 默认 ../reset/signer
let signerDir = path.resolve(petDir, '..', 'reset', 'signer');
if (process.argv[2]) signerDir = path.resolve(process.argv[2]);

if (!fs.existsSync(path.join(signerDir, 'bin', 'reset-signer.mjs'))) {
  console.error('✗ 找不到 RESET signer：' + signerDir);
  console.error('  用法：node setup.js "你的signer目录绝对路径"');
  process.exit(1);
}
console.log('✓ signer 目录：' + signerDir);

// 2. 自动检测钱包地址
const password = readSecret('.password');
if (!password) {
  console.error('✗ 找不到 ~/.reset-signer/.password，请先完成 RESET signer 初始化');
  process.exit(1);
}

let address = '';
try {
  const out = execSync(`"${process.execPath}" bin/reset-signer.mjs address`, {
    cwd: signerDir,
    env: { ...process.env, RESET_SIGNER_PASSWORD: password },
    timeout: 20000,
  }).toString().trim();
  address = JSON.parse(out).address || '';
} catch (e) {
  console.error('✗ 自动检测钱包地址失败：' + e.message);
}

if (address) {
  console.log('✓ 检测到钱包地址：' + address);
} else {
  console.log('⚠ 未自动获取到钱包地址，config.json 里 walletAddress 留空，请手动填写');
}

// 3. 写 config.json
const config = {
  walletAddress: address,
  nodePath: process.execPath,
  signerDir: signerDir,
};
fs.writeFileSync(path.join(petDir, 'config.json'), JSON.stringify(config, null, 2) + '\n');
console.log('✓ 已写入 config.json');

// 4. 创建桌面快捷方式（best-effort）
try {
  execSync('powershell.exe -NoProfile -File "' + path.join(petDir, 'make-shortcut.ps1') + '"', { timeout: 15000, stdio: 'inherit' });
} catch (e) {
  console.log('⚠ 桌面快捷方式创建失败（不影响使用，可手动双击 start-pet.vbs 启动）');
}

console.log('');
console.log('========== 完成 ==========');
console.log('以后双击桌面「RESET挖矿」图标 或 本目录 start-pet.vbs 即可开始挖矿。');
console.log('双击桌宠角色 = 开/关挖矿；右键 → 退出宠物 可完全停止。');
console.log('右键 → 切换皮肤（Steve/Goku）、语言（中文/English）。');
console.log('按 Ctrl+Alt+H 一键隐身（打游戏不挡视线），挖矿照跑。');
