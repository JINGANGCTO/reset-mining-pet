# RESET 挖矿桌宠（reset-mining-pet）

一个桌面宠物，把 RESET 挖矿 agent 变成「启动桌宠 = 开始挖矿，退出桌宠 = 停止挖矿」的傻瓜开关，无黑窗口，还能换皮肤（Steve / Goku）。

## 前置条件

1. **RESET signer 已经装好**，能正常挖矿（有 `~/.reset-signer/.password` 和 `~/.reset-signer/.deepseek-key`）。
2. **Node.js 已安装**（在 PATH 里，`node -v` 能出结果）。

## 安装（一键，约 2 分钟）

1. 把整个项目文件夹复制到你的 RESET 仓库**旁边**（同级目录）。比如 RESET 仓库在 `桌面/reset`，桌宠就放 `桌面/reset-mining-pet`。
2. 双击 `安装.bat`，它会自动：
   - 装依赖（electron，首次下载几十 MB）
   - 检测你的钱包地址（直接读你本地的 signer，不用你手动填）
   - 写 config.json
   - 在桌面创建「RESET挖矿」图标
3. 完成，双击桌面「RESET挖矿」图标即可。

> 如果你的 RESET 仓库不在桌宠的上一级目录（`..\reset`），装完依赖后手动跑一次：
> `node setup.js "你的signer目录绝对路径"`

> 如果你是用 git 拉下来的：`git clone <仓库地址>` 后，先 `cd` 进目录，再双击 `安装.bat`。

## 怎么用

- **开始挖矿**：双击桌面「RESET挖矿」图标（或 `start-pet.vbs`）。自动后台拉起 agent + 面板，无黑窗口。
- **停止挖矿**：右键桌宠 →「退出宠物（停止挖矿）」。agent 和面板一起关掉。
- **换皮肤**：右键桌宠 →「切换皮肤」→ 选 Steve / Goku。
- **看状态**：桌宠顶部标签，绿色「⛏ 挖矿中」= agent 在跑，红色「⚠ 挖矿已停」= agent 没在跑。点一下桌宠看详情（余额/锁仓/公平份额/挖矿窗口）。
- **打开面板**：右键桌宠 →「打开 RESET 面板」（本地 http://127.0.0.1:4747）。
- **复制钱包地址**：右键桌宠 →「复制钱包地址」。
- **拖动**：按住桌宠拖动移动位置。

## 常见问题

**Q: 桌宠红色「挖矿已停」，但我明明启动了？**
挖矿 agent 进程挂了。右键退出桌宠再重新双击。反复挂说明 agent 本身有问题（和桌宠无关）。

**Q: 面板(4747)打不开？**
退出桌宠再启动一次。面板是桌宠启动时一起拉起的。

**Q: 想改模型 / 轮询频率？**
挖矿参数在 `main.js` 的 `startAgent()` 里（默认 deepseek-flash）；轮询在 `renderer.js` 顶部 `POLL_MS`。

**Q: 非 Windows？**
不支持（用了 PowerShell 检测进程 + .vbs 启动）。Mac/Linux 要改检测和启动部分。

## 加新皮肤（从 petdex 找宠物）

皮肤来自 [petdex.dev](https://petdex.dev)（开源像素宠物画廊）。加一个只需三步：

1. 下载宠物素材：
   ```
   npx -y petdex install <slug>
   ```
   会装到 `~/.petdex/pets/<slug>/`，里面有 `spritesheet.webp`（8×9 网格，每帧 192×208）。
2. 裁成逐帧 PNG。状态行号对应关系（Codex 精灵格式）：
   - 第 0 行 = idle（6 帧）
   - 第 3 行 = happy/挥手（4 帧）
   - 第 4 行 = excited/跳跃（5 帧）
   - 第 5 行 = sad/难过（8 帧）
   - 第 7 行 = mining/原地跑（6 帧）
   裁好放到 `assets/<名字>/<状态>_<序号>.png`（参考 `assets/goku/`）。
3. 代码里加两行：
   - `renderer.js` 的 SKINS：`<key>: framesSkin('<显示名>', '<文件夹名>')`
   - `main.js` 的 SKIN_LIST：`{ key: '<key>', label: '<显示名>' }`

重启桌宠，右键菜单就会出现新皮肤。

## 文件说明

- `安装.bat` — 一键安装（npm install + setup.js）
- `setup.js` — 自动检测钱包地址、写 config.json、建快捷方式
- `main.js` — 主进程：窗口、菜单、agent 启停、存活检测、皮肤列表
- `renderer.js` — 界面：轮询链上数据、状态展示、皮肤定义
- `preload.js` — 主进程与界面之间的桥
- `config.json` — 配置（安装时自动生成，一般不用手动改）
- `check-agent.ps1` / `kill-agent.ps1` — 检测 / 杀掉 agent+面板
- `start-pet.vbs` — 无窗口启动桌宠
- `assets/steve/`、`assets/goku/` — 皮肤逐帧图
