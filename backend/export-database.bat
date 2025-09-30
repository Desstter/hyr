@echo off
REM =====================================================
REM SCRIPT DE EXPORTACION AUTOMATICA - BASE DE DATOS HYR
REM Genera backup completo con estructura y datos
REM =====================================================

echo.
echo ========================================================
echo   EXPORTACION AUTOMATICA - BASE DE DATOS HYR
echo   Sistema de Gestion Empresarial HYR Constructora
echo ========================================================
echo.

REM Configuracion de variables
SET DB_HOST=localhost
SET DB_PORT=5432
SET DB_NAME=hyr_construction
SET DB_USER=postgres
SET TIMESTAMP=%date:~-4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%%time:~6,2%
SET TIMESTAMP=%TIMESTAMP: =0%
SET OUTPUT_FILE=hyr_database_backup_%TIMESTAMP%.sql

echo [1/4] Configuracion:
echo    - Base de datos: %DB_NAME%
echo    - Host: %DB_HOST%:%DB_PORT%
echo    - Usuario: %DB_USER%
echo    - Archivo salida: %OUTPUT_FILE%
echo.

REM Verificar que pg_dump esta disponible
where pg_dump >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] pg_dump no esta disponible en el PATH
    echo.
    echo Soluciones:
    echo   1. Agregar PostgreSQL\bin al PATH del sistema
    echo   2. Usar el archivo SQL manual: hyr-database-complete-backup.sql
    echo.
    pause
    exit /b 1
)

echo [2/4] Iniciando exportacion con pg_dump...
echo.

REM Ejecutar pg_dump
pg_dump -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% ^
  --clean ^
  --create ^
  --if-exists ^
  --no-owner ^
  --no-privileges ^
  --encoding=UTF8 ^
  --file=%OUTPUT_FILE%

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] La exportacion fallo
    echo Verifique:
    echo   - Que PostgreSQL este ejecutandose
    echo   - Que las credenciales sean correctas
    echo   - Que la base de datos exista
    echo.
    pause
    exit /b 1
)

echo.
echo [3/4] Exportacion completada exitosamente!
echo.

REM Obtener tamano del archivo
for %%A in ("%OUTPUT_FILE%") do set FILE_SIZE=%%~zA
set /a FILE_SIZE_KB=%FILE_SIZE% / 1024

echo [4/4] Informacion del backup:
echo    - Archivo: %OUTPUT_FILE%
echo    - Tamano: %FILE_SIZE_KB% KB
echo    - Ubicacion: %CD%\%OUTPUT_FILE%
echo.

echo ========================================================
echo   EXPORTACION COMPLETADA EXITOSAMENTE
echo ========================================================
echo.
echo Siguiente paso:
echo   1. Transferir el archivo %OUTPUT_FILE% a tu servidor
echo   2. Seguir las instrucciones en RESTORE-INSTRUCTIONS.md
echo.

pause