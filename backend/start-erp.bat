@echo off
rem Starts the ERP program. If it ever stops by itself, it starts again after 5 seconds.
cd /d "%~dp0"
title Divyadip ERP (keep this window open)
:loop
node server.js
echo.
echo The ERP program stopped. Starting it again in 5 seconds... (close this window to stop it for good)
timeout /t 5 >nul
goto loop