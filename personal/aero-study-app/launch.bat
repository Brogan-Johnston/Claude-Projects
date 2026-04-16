@echo off
setlocal enabledelayedexpansion

:: Move to the folder this script lives in, regardless of where it was launched from
cd /d "%~dp0"

echo ============================================================
echo   AeroStudy - Automated Setup and Launch
echo ============================================================
echo.

:: ----------------------------------------------------------------
:: STEP 1 - Check Python is installed and version is 3.11+
:: ----------------------------------------------------------------
echo [Step 1/5] Checking Python installation...

python --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo   ERROR: Python was not found on PATH.
    echo   Install Python 3.11+ from https://python.org and make sure
    echo   to check "Add Python to PATH" during installation.
    echo   Then re-run this script.
    goto :fail
)

for /f "tokens=2" %%V in ('python --version 2^>^&1') do set PYVER=%%V
for /f "tokens=1,2 delims=." %%A in ("!PYVER!") do (
    set MAJOR=%%A
    set MINOR=%%B
)

if !MAJOR! LSS 3 goto :badver
if !MAJOR! EQU 3 if !MINOR! LSS 11 goto :badver
echo   Python !PYVER! found. OK.
echo.
goto :step2

:badver
echo.
echo   ERROR: Python 3.11 or newer is required. Found !PYVER!.
echo   Update Python from https://python.org and re-run this script.
goto :fail

:: ----------------------------------------------------------------
:: STEP 2 - Confirm we are in the right directory
:: ----------------------------------------------------------------
:step2
echo [Step 2/5] Confirming project directory...

if not exist "requirements.txt" (
    echo.
    echo   ERROR: requirements.txt not found.
    echo   Make sure launch.bat is inside the aero-study-app folder
    echo   alongside app.py and requirements.txt.
    goto :fail
)
if not exist "app.py" (
    echo.
    echo   ERROR: app.py not found.
    echo   Make sure launch.bat is inside the aero-study-app folder.
    goto :fail
)
echo   Directory OK: %CD%
echo.

:: ----------------------------------------------------------------
:: STEP 3 - Create virtual environment (if it does not already exist)
:: ----------------------------------------------------------------
echo [Step 3/5] Setting up virtual environment...

if exist ".venv\Scripts\activate.bat" (
    echo   Virtual environment already exists. Skipping creation.
) else (
    echo   Creating .venv ...
    python -m venv .venv
    if errorlevel 1 (
        echo.
        echo   ERROR: Failed to create virtual environment.
        goto :fail
    )
    echo   Virtual environment created.
)

echo   Activating .venv ...
call .venv\Scripts\activate.bat
if errorlevel 1 (
    echo.
    echo   ERROR: Failed to activate virtual environment.
    goto :fail
)
echo   Virtual environment active.
echo.

:: ----------------------------------------------------------------
:: STEP 4 - Upgrade pip, install and verify dependencies
:: ----------------------------------------------------------------
echo [Step 4/5] Installing dependencies...
echo.

echo   [4.3] Upgrading pip...
python -m pip install --upgrade pip --quiet
if errorlevel 1 (
    echo   WARNING: pip upgrade failed. Continuing anyway.
) else (
    echo   pip is up to date.
)
echo.

echo   [4.4] Running: pip install -r requirements.txt
echo   This may take 1-3 minutes on first run (numpy and scipy are large).
echo.
pip install -r requirements.txt
if errorlevel 1 (
    echo.
    echo   ERROR: Dependency installation failed.
    echo   Check the output above for details.
    goto :fail
)
echo.

echo   [4.6] Verifying all packages import correctly...
python -c "import streamlit, numpy, scipy, plotly, matplotlib; print('   All packages OK')"
if errorlevel 1 (
    echo.
    echo   ERROR: One or more packages failed to import after installation.
    echo   Try deleting the .venv folder and re-running this script.
    goto :fail
)
echo.

:: ----------------------------------------------------------------
:: STEP 5 - Launch the app
:: ----------------------------------------------------------------
echo [Step 5/5] Launching AeroStudy...
echo.
echo   The app will open in your browser at http://localhost:8501
echo   Press Ctrl+C in this window to stop the app.
echo   To exit this window after stopping: type "deactivate" then close it.
echo.
echo ============================================================
echo.
streamlit run app.py
goto :end

:: ----------------------------------------------------------------
:: Shared failure handler
:: ----------------------------------------------------------------
:fail
echo.
echo ============================================================
echo   Setup did not complete. See error above.
echo ============================================================
echo.
pause
exit /b 1

:end
endlocal
