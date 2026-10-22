@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ==========================================
echo  RESET 挖矿桌宠 一键安装
echo ==========================================
echo.

echo [1/2] 安装依赖 electron（首次需下载，约几十 MB，请稍候）...
call npm install
if errorlevel 1 (
    echo.
    echo [失败] 依赖安装出错。请确认已安装 Node.js 且在 PATH 中，然后重试。
    pause
    exit /b 1
)

echo.
echo [2/2] 自动配置（检测钱包地址、写配置、建快捷方式）...
node setup.js
if errorlevel 1 (
    echo.
    echo 配置未完成，可手动编辑 config.json 后直接双击 start-pet.vbs。
    pause
    exit /b 1
)

echo.
pause
