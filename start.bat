@echo off
title Land Records App Launcher
echo ==============================================
echo    Starting Land Records Backend and Frontend
echo ==============================================
echo.

:: 1. Backend start in new window
echo [1/2] Starting FastAPI Backend on http://127.0.0.1:8000 ...
start "Backend (FastAPI)" cmd /k "python -m uvicorn app.main:app --reload --port 8000"

:: 2. Frontend start in new window
echo [2/2] Starting React Frontend on http://localhost:5173 ...
start "Frontend (Vite)" cmd /k "cd ilrdvs-frontend && npm run dev"

echo.
echo Both servers are running!
echo  - Frontend: http://localhost:5173
echo  - Backend API Docs: http://127.0.0.1:8000/docs
echo.
