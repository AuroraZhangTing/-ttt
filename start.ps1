Write-Host "=== 启动产学研项目管理系统 ===" -ForegroundColor Green

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

# Start backend
Write-Host "[1/2] 启动后端服务..." -ForegroundColor Yellow
$be = Start-Process -NoNewWindow -FilePath "node" -ArgumentList "src/index.js" -WorkingDirectory "$root\backend" -PassThru
Start-Sleep -Seconds 2

# Start frontend
Write-Host "[2/2] 启动前端服务..." -ForegroundColor Yellow
$fe = Start-Process -NoNewWindow -FilePath "npx.cmd" -ArgumentList "vite" -WorkingDirectory "$root\frontend" -PassThru

Write-Host ""
Write-Host "=== 启动完成 ===" -ForegroundColor Green
Write-Host "前端地址: http://localhost:5173" -ForegroundColor Cyan
Write-Host "后端地址: http://localhost:3000" -ForegroundColor Cyan
Write-Host "默认账号: admin / admin123" -ForegroundColor Cyan
Write-Host ""
Write-Host "按任意键停止服务..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Cleanup
Stop-Process -Id $be.Id -Force -ErrorAction SilentlyContinue
Stop-Process -Id $fe.Id -Force -ErrorAction SilentlyContinue
Write-Host "服务已停止" -ForegroundColor Green
