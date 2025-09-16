@echo off
echo ========================================
echo    POS System - GitHub Pages Deploy
echo ========================================
echo.

echo [1/3] Building project...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Build failed!
    pause
    exit /b 1
)

echo.
echo [2/3] Deploying to GitHub Pages...
powershell -ExecutionPolicy Bypass -File deploy.ps1
if %errorlevel% neq 0 (
    echo ERROR: Deployment failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo    Deployment Complete!
echo ========================================
echo.
echo Your site is live at:
echo https://lateefsan123.github.io/retailpos/
echo.
echo Press any key to exit...
pause >nul
