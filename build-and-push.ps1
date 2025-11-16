# 本地构建 Docker 镜像并推送到 Docker Hub (PowerShell 版本)
# 使用方法: .\build-and-push.ps1 [版本号]

param(
    [string]$Version = "latest"
)

$ErrorActionPreference = "Stop"

# Docker Hub 用户名和仓库名
$DockerUsername = "tutusiji"
$ImageName = "calendar-task-manager"
$FullImageName = "$DockerUsername/$ImageName"

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "构建并推送 Docker 镜像" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "镜像名称: ${FullImageName}:${Version}" -ForegroundColor Yellow
Write-Host ""

# 1. 构建镜像
Write-Host "1. 构建 Docker 镜像..." -ForegroundColor Green
docker build -t "${FullImageName}:${Version}" .

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 构建失败" -ForegroundColor Red
    exit 1
}

# 如果版本不是 latest，也打上 latest 标签
if ($Version -ne "latest") {
    Write-Host "2. 添加 latest 标签..." -ForegroundColor Green
    docker tag "${FullImageName}:${Version}" "${FullImageName}:latest"
}

# 3. 登录 Docker Hub
Write-Host "3. 登录 Docker Hub..." -ForegroundColor Green
Write-Host "请输入 Docker Hub 凭据（如果已登录则会跳过）" -ForegroundColor Yellow

docker login
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 登录失败，请检查凭据" -ForegroundColor Red
    exit 1
}

# 4. 推送镜像
Write-Host "4. 推送镜像到 Docker Hub..." -ForegroundColor Green
docker push "${FullImageName}:${Version}"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 推送失败" -ForegroundColor Red
    exit 1
}

if ($Version -ne "latest") {
    docker push "${FullImageName}:latest"
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "✅ 构建并推送完成！" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "镜像已推送:" -ForegroundColor Yellow
Write-Host "  ${FullImageName}:${Version}" -ForegroundColor White
if ($Version -ne "latest") {
    Write-Host "  ${FullImageName}:latest" -ForegroundColor White
}
Write-Host ""
Write-Host "在服务器上使用以下命令拉取:" -ForegroundColor Yellow
Write-Host "  docker pull ${FullImageName}:${Version}" -ForegroundColor White
Write-Host ""
Write-Host "或更新 docker-compose.yml 中的镜像版本后运行:" -ForegroundColor Yellow
Write-Host "  docker-compose pull" -ForegroundColor White
Write-Host "  docker-compose up -d" -ForegroundColor White
Write-Host ""
