@echo off
setlocal

set "ROOT=%~dp0"
cd /d "%ROOT%"

echo ============================================
echo   Wingman - Academic Command Center
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js was not found on this computer.
    echo Install it from https://nodejs.org ^(the LTS version^) and run this file again.
    echo.
    pause
    exit /b 1
)

if not exist "%ROOT%backend\.env" (
    echo Creating backend\.env from backend\.env.example ...
    copy /y "%ROOT%backend\.env.example" "%ROOT%backend\.env" >nul
    echo   Done. Add your Anthropic API key later from the app's Settings page,
    echo   or by editing backend\.env directly.
    echo.
)

if not exist "%ROOT%backend\node_modules" (
    echo Installing backend dependencies - this only happens once, may take a minute...
    pushd "%ROOT%backend"
    call npm install
    if errorlevel 1 (
        echo [ERROR] Backend dependency install failed. See the messages above.
        popd
        pause
        exit /b 1
    )
    popd
    echo.
)

if not exist "%ROOT%frontend\node_modules" (
    echo Installing frontend dependencies - this only happens once, may take a minute...
    pushd "%ROOT%frontend"
    call npm install
    if errorlevel 1 (
        echo [ERROR] Frontend dependency install failed. See the messages above.
        popd
        pause
        exit /b 1
    )
    popd
    echo.
)

echo Starting backend on http://localhost:4000 ...
start "Wingman Backend" cmd /k "cd /d "%ROOT%backend"&&npm run dev"

echo Starting frontend on http://localhost:5173 ...
start "Wingman Frontend" cmd /k "cd /d "%ROOT%frontend"&&npm run dev"

echo.
echo Waiting for the app to boot...
timeout /t 6 /nobreak >nul

start "" "http://localhost:5173"

echo.
echo Wingman is up. Two windows opened for you - "Wingman Backend" and "Wingman Frontend".
echo Keep those two windows open while you use the app; close them (or just close this
echo window and them) whenever you're done.
echo.
pause
