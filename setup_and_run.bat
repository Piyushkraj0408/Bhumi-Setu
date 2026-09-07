@echo off
title Land Records - Full Setup and Run
echo ==============================================
echo  1. Installing Backend Requirements...
pip install -r requirements.txt

echo.
echo  2. Seeding Database (Roles and Users)...
python -m scripts.seed_roles

echo.
echo  3. Installing Frontend Dependencies...
cd ilrdvs-frontend
call npm install
cd ..

echo.
echo  4. Starting Servers...
start "Backend (FastAPI)" cmd /k "python -m uvicorn app.main:app --reload --port 8000"
start "Frontend (Vite)" cmd /k "cd ilrdvs-frontend && npm run dev"

echo.
echo Done! 
echo Frontend: http://localhost:5173
echo API Docs: http://127.0.0.1:8000/docs
pause
