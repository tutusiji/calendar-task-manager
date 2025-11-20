# ========================================
# 离线部署包制作脚本
# 适用于 Windows PowerShell
# ========================================

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  制作离线部署包" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 设置部署包目录
$deployDir = ".\offline-deploy"
$imagesDir = "$deployDir\images"
$configDir = "$deployDir\config"
$scriptsDir = "$deployDir\scripts"

# 步骤 1: 创建目录结构
Write-Host "步骤 1/6: 创建目录结构..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $imagesDir | Out-Null
New-Item -ItemType Directory -Force -Path $configDir | Out-Null
New-Item -ItemType Directory -Force -Path $scriptsDir | Out-Null
Write-Host "✅ 目录结构创建完成" -ForegroundColor Green
Write-Host ""

# 步骤 2: 构建应用镜像
Write-Host "步骤 2/6: 构建应用镜像..." -ForegroundColor Yellow
Write-Host "这可能需要几分钟时间..." -ForegroundColor Gray
docker build -t calendar-task-manager:latest .

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 镜像构建失败" -ForegroundColor Red
    exit 1
}
Write-Host "✅ 应用镜像构建完成" -ForegroundColor Green
Write-Host ""

# 步骤 3: 拉取 PostgreSQL 镜像
Write-Host "步骤 3/6: 拉取 PostgreSQL 镜像..." -ForegroundColor Yellow
docker pull postgres:16-alpine

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ PostgreSQL 镜像拉取失败" -ForegroundColor Red
    exit 1
}
Write-Host "✅ PostgreSQL 镜像拉取完成" -ForegroundColor Green
Write-Host ""

# 步骤 4: 导出镜像
Write-Host "步骤 4/6: 导出镜像为 tar 文件..." -ForegroundColor Yellow

Write-Host "  导出应用镜像 (约2GB，需要几分钟)..." -ForegroundColor Gray
docker save -o "$imagesDir\calendar-app.tar" calendar-task-manager:latest

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 应用镜像导出失败" -ForegroundColor Red
    exit 1
}

$appSize = (Get-Item "$imagesDir\calendar-app.tar").Length / 1MB
Write-Host "  ✅ 应用镜像: $([math]::Round($appSize, 2)) MB" -ForegroundColor Green

Write-Host "  导出 PostgreSQL 镜像..." -ForegroundColor Gray
docker save -o "$imagesDir\postgres.tar" postgres:16-alpine

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ PostgreSQL 镜像导出失败" -ForegroundColor Red
    exit 1
}

$pgSize = (Get-Item "$imagesDir\postgres.tar").Length / 1MB
Write-Host "  ✅ PostgreSQL 镜像: $([math]::Round($pgSize, 2)) MB" -ForegroundColor Green
Write-Host ""

# 步骤 5: 复制配置文件和脚本
Write-Host "步骤 5/6: 复制配置文件和脚本..." -ForegroundColor Yellow

# 复制配置文件
Copy-Item ".\docker-compose.yml" "$configDir\" -Force
Copy-Item ".\database-full-update.sql" "$configDir\" -Force

# 创建 .env.example
@"
# PostgreSQL 数据库密码
POSTGRES_PASSWORD=your_strong_password_here

# Docker 镜像名称
DOCKER_IMAGE=calendar-task-manager:latest
"@ | Out-File -FilePath "$configDir\.env.example" -Encoding UTF8

# 复制 Linux 部署脚本
Copy-Item ".\deploy\scripts\*.sh" "$scriptsDir\" -Force

# 复制部署指南
Copy-Item ".\offline-deployment-guide.md" "$deployDir\README.md" -Force

Write-Host "✅ 配置文件和脚本复制完成" -ForegroundColor Green
Write-Host ""

# 步骤 6: 创建 Windows 批处理脚本
Write-Host "步骤 6/6: 创建 Windows 批处理脚本..." -ForegroundColor Yellow

# Windows 加载脚本
@"
@echo off
echo ==================================
echo 加载 Docker 镜像
echo ==================================
echo.

echo 正在加载应用镜像...
docker load -i images\calendar-app.tar
if %errorlevel% neq 0 (
    echo 应用镜像加载失败
    pause
    exit /b 1
)

echo 正在加载 PostgreSQL 镜像...
docker load -i images\postgres.tar
if %errorlevel% neq 0 (
    echo PostgreSQL 镜像加载失败
    pause
    exit /b 1
)

echo.
echo ==================================
echo 镜像加载完成！
echo ==================================
echo.

docker images
pause
"@ | Out-File -FilePath "$scriptsDir\1-load-images.bat" -Encoding ASCII

# Windows 启动脚本
@"
@echo off
echo ==================================
echo 启动应用
echo ==================================
echo.

cd config

if not exist .env (
    echo 创建 .env 文件...
    copy .env.example .env
    echo 请编辑 config\.env 文件设置数据库密码
    pause
)

echo 启动服务...
docker-compose up -d

echo.
echo 查看容器状态:
docker-compose ps

echo.
echo ==================================
echo 应用启动完成！
echo ==================================
echo.
echo 访问地址: http://localhost:8100
echo 数据库管理: http://localhost:5555
echo.
pause
"@ | Out-File -FilePath "$scriptsDir\2-start-app.bat" -Encoding ASCII

Write-Host "✅ Windows 批处理脚本创建完成" -ForegroundColor Green
Write-Host ""

# 显示部署包信息
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  📦 部署包制作完成！" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$totalSize = (Get-ChildItem -Path $deployDir -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
Write-Host "部署包位置: $deployDir" -ForegroundColor Green
Write-Host "总大小: $([math]::Round($totalSize, 2)) MB" -ForegroundColor Green
Write-Host ""

Write-Host "部署包内容:" -ForegroundColor Yellow
Write-Host "  📁 images/" -ForegroundColor Gray
Write-Host "     - calendar-app.tar      ($([math]::Round($appSize, 2)) MB)" -ForegroundColor Gray
Write-Host "     - postgres.tar          ($([math]::Round($pgSize, 2)) MB)" -ForegroundColor Gray
Write-Host "  📁 config/" -ForegroundColor Gray
Write-Host "     - docker-compose.yml" -ForegroundColor Gray
Write-Host "     - database-full-update.sql" -ForegroundColor Gray
Write-Host "     - .env.example" -ForegroundColor Gray
Write-Host "  📁 scripts/" -ForegroundColor Gray
Write-Host "     - Linux 部署脚本 (.sh)" -ForegroundColor Gray
Write-Host "     - Windows 部署脚本 (.bat)" -ForegroundColor Gray
Write-Host "  📄 README.md (部署指南)" -ForegroundColor Gray
Write-Host ""

Write-Host "下一步操作:" -ForegroundColor Yellow
Write-Host "  1. 将 offline-deploy 文件夹复制到 U 盘或内网文件服务器" -ForegroundColor White
Write-Host "  2. 在目标服务器上执行部署脚本" -ForegroundColor White
Write-Host "     - Linux: ./scripts/deploy-all.sh" -ForegroundColor White
Write-Host "     - Windows: scripts\1-load-images.bat 然后 scripts\2-start-app.bat" -ForegroundColor White
Write-Host ""

# 询问是否压缩
$compress = Read-Host "是否压缩成 ZIP 文件? (Y/N)"
if ($compress -eq "Y" -or $compress -eq "y") {
    Write-Host ""
    Write-Host "正在压缩..." -ForegroundColor Yellow
    Compress-Archive -Path "$deployDir\*" -DestinationPath "calendar-offline-deploy.zip" -Force
    $zipSize = (Get-Item "calendar-offline-deploy.zip").Length / 1MB
    Write-Host "✅ 压缩完成: calendar-offline-deploy.zip ($([math]::Round($zipSize, 2)) MB)" -ForegroundColor Green
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  全部完成！" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
