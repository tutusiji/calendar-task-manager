# 修复归档功能 500 错误的快速脚本

Write-Host "🔧 开始修复归档功能..." -ForegroundColor Cyan

# 1. 检查数据库字段
Write-Host "`n1️⃣ 检查数据库字段..." -ForegroundColor Yellow
npx tsx scripts/check-archive-fields.ts

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 数据库字段检查失败" -ForegroundColor Red
    exit 1
}

# 2. 清理 Next.js 缓存
Write-Host "`n2️⃣ 清理 Next.js 缓存..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Recurse -Force .next
    Write-Host "✅ .next 目录已清理" -ForegroundColor Green
}

# 3. 测试 API 逻辑
Write-Host "`n3️⃣ 测试 API 逻辑..." -ForegroundColor Yellow
npx tsx scripts/test-archive-api.ts

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ API 逻辑测试失败" -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ 修复完成！" -ForegroundColor Green
Write-Host "`n📝 下一步操作:" -ForegroundColor Cyan
Write-Host "   1. 重启开发服务器: npm run dev" -ForegroundColor White
Write-Host "   2. 清除浏览器缓存: Ctrl+Shift+R" -ForegroundColor White
Write-Host "   3. 重新测试归档功能" -ForegroundColor White
