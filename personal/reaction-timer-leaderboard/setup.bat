@echo off
setlocal enabledelayedexpansion
title Reaction Timer Leaderboard -- Setup

echo.
echo ================================================
echo   Reaction Timer Leaderboard -- Setup
echo ================================================
echo.

REM ── Privilege notice ─────────────────────────────────────────────────────
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo NOTE: Not running as Administrator.
    echo       If any step fails, right-click setup.bat and choose
    echo       "Run as administrator", then try again.
    echo.
)

REM ── 1. Winget ─────────────────────────────────────────────────────────────
echo [1/3] Checking for winget...
winget --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [FAIL] winget not found.
    echo        Open the Microsoft Store and install "App Installer", then re-run this script.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('winget --version') do echo       Found: winget %%v
echo.

REM ── 2. Python ────────────────────────────────────────────────────────────
echo [2/3] Checking for Python...
python --version >nul 2>&1
if %errorlevel% == 0 (
    for /f "tokens=*" %%v in ('python --version 2^>^&1') do echo       Found: %%v ^(no install needed^)
) else (
    echo       Python not found -- installing Python 3.12 via winget...
    echo       This may take a minute.
    echo.
    winget install --id Python.Python.3.12 --source winget ^
        --accept-package-agreements --accept-source-agreements --silent
    if %errorlevel% neq 0 (
        echo.
        echo [FAIL] Python install failed.
        echo        Try running this script as Administrator.
        pause
        exit /b 1
    )
    echo.
    echo       Python installed successfully.

    REM Refresh PATH from registry so pip is usable in this session
    for /f "usebackq tokens=2,*" %%A in (
        `reg query HKCU\Environment /v PATH 2^>nul`
    ) do set "user_path=%%B"
    for /f "usebackq tokens=2,*" %%A in (
        `reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v PATH 2^>nul`
    ) do set "sys_path=%%B"
    set "PATH=!sys_path!;!user_path!"
)
echo.

REM ── 3. pyserial ──────────────────────────────────────────────────────────
echo [3/3] Installing pyserial...
echo.

REM Try python -m pip first; fall back to py -m pip (launcher) if needed
python -m pip install --upgrade pyserial
if %errorlevel% == 0 goto :pip_ok

py -m pip install --upgrade pyserial
if %errorlevel% == 0 goto :pip_ok

echo.
echo [FAIL] Could not install pyserial.
echo        Make sure Python and pip are installed correctly, then re-run.
pause
exit /b 1

:pip_ok
echo.

REM ── Done ─────────────────────────────────────────────────────────────────
echo ================================================
echo   Setup complete -- all dependencies installed.
echo ================================================
echo.
echo To start the leaderboard, run:
echo   python leaderboard.py
echo.
echo Make sure your Arduino is plugged in before launching.
echo.
pause
endlocal
