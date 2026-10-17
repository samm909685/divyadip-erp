@echo off
rem Makes Windows run backup-now.bat by itself every day. Double-click this file once.
set /p T=At what time should the daily backup run? Use the 24-hour clock, for example 18:30 :
schtasks /create /tn "Divyadip ERP Backup" /tr "\"%~dp0backup-now.bat\" /silent" /sc daily /st %T% /f
if errorlevel 1 (
  echo.
  echo Could not set it up. Right-click this file and choose "Run as administrator", then try again.
  pause
  exit /b 1
)
echo.
echo Done. A backup will be made every day at %T%, if the computer is switched on then.
pause