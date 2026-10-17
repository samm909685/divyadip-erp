@echo off
rem Makes a backup right now. Double-click this file.
cd /d "%~dp0"
node scripts\backup.js
set CODE=%errorlevel%
if "%1"=="/silent" exit /b %CODE%
echo.
if not "%CODE%"=="0" (
  echo BACKUP FAILED. Please call support.
  pause
  exit /b %CODE%
)
echo Backup finished.
timeout /t 5 >nul