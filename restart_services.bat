@echo off
echo ========================================
echo Restarting Database Agent Services
echo ========================================
echo.

echo [1/4] Stopping backend services...
taskkill /F /FI "WINDOWTITLE eq uvicorn*" 2>nul
taskkill /F /IM python.exe /FI "MEMUSAGE gt 100000" 2>nul
timeout /t 2 /nobreak >nul

echo [2/4] Stopping frontend services...
taskkill /F /IM node.exe /FI "MEMUSAGE gt 200000" 2>nul
timeout /t 2 /nobreak >nul

echo [3/4] Starting backend service...
start "Database Agent Backend" cmd /k "cd /d %~dp0 && python -m uvicorn app.api.server:app --reload --host 0.0.0.0 --port 8000"
timeout /t 3 /nobreak >nul

echo [4/4] Starting frontend service...
start "Database Agent Frontend" cmd /k "cd /d %~dp0\frontend && npm run dev"

echo.
echo ========================================
echo Services Restarted Successfully!
echo ========================================
echo.
echo Backend: http://localhost:8000
echo Frontend: http://localhost:5173
echo API Docs: http://localhost:8000/docs
echo.
echo Press any key to close this window...
pause >nul
