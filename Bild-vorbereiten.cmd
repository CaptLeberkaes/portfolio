@echo off
rem ============================================================
rem  Bild fuer die Website aufbereiten.
rem
rem  BENUTZUNG:
rem    * Foto auf diese Datei ZIEHEN (Drag & Drop)  -> fragt nur nach Name
rem    * oder DOPPELKLICK                           -> fragt nach Datei + Name
rem
rem  Mehrere Fotos gleichzeitig draufziehen geht auch: es wird
rem  eines nach dem anderen abgearbeitet.
rem ============================================================
setlocal
set "PS=%~dp0bild-vorbereiten.ps1"

if not exist "%PS%" (
  echo FEHLER: bild-vorbereiten.ps1 wurde nicht gefunden neben dieser Datei.
  echo.
  pause
  exit /b 1
)

rem --- Doppelklick (kein Bild uebergeben): voll interaktiv ---
if "%~1"=="" (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%PS%"
  echo.
  pause
  exit /b
)

rem --- Drag and Drop: ein oder mehrere Bilder abarbeiten ---
:loop
if "%~1"=="" goto done
echo ============================================================
echo  %~nx1
echo ============================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%PS%" -Source "%~1"
shift
goto loop

:done
echo.
echo Alle Bilder verarbeitet.
pause
