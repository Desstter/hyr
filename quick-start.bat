@echo off
echo 🚀 INICIANDO SISTEMA HYR CONSTRUCTORA & SOLDADURA
echo.

echo 📋 Paso 1: Cargando datos empresariales...
cd backend
node load-seeds.js

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Error cargando datos. Verifica que PostgreSQL esté ejecutándose.
    pause
    exit /b 1
)

echo.
echo 📋 Paso 2: Iniciando servidor backend...
echo Backend corriendo en http://localhost:3001
echo.
echo 📋 Para iniciar frontend (en nueva terminal):
echo    cd construction-admin
echo    npm run dev
echo.
echo 📋 Dashboard empresarial estará en:
echo    http://localhost:3000/dashboard-api
echo.

node server.js