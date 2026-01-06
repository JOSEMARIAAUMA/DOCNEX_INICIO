@echo off
setlocal enableextensions

REM ==========================================================
REM NexDoc AI - Bootstrap de estructura de repo (Windows)
REM Ejecutar desde la RAÍZ del repositorio
REM ==========================================================

echo.
echo ==========================================================
echo  Creando estructura de carpetas...
echo ==========================================================

REM Carpetas principales
mkdir "docs" 2>nul
mkdir "planning" 2>nul
mkdir ".github" 2>nul
mkdir ".github\ISSUE_TEMPLATE" 2>nul
mkdir "supabase" 2>nul
mkdir "apps" 2>nul
mkdir "packages" 2>nul

REM Subcarpetas recomendadas (opcionales)
mkdir "apps\web" 2>nul
mkdir "apps\worker" 2>nul
mkdir "packages\shared" 2>nul

echo.
echo ==========================================================
echo  Creando archivos base si no existen...
echo ==========================================================

REM docs/BRIEFING.md
if not exist "docs\BRIEFING.md" (
  > "docs\BRIEFING.md" (
    echo # NexDoc AI — Briefing
    echo.
    echo Este archivo es la fuente de verdad del briefing en texto.
    echo.
    echo - Objetivo:
    echo - Alcance MVP:
    echo - Reglas de trabajo:
  )
  echo Creado: docs\BRIEFING.md
) else (
  echo Ya existe: docs\BRIEFING.md
)

REM planning/README.md
if not exist "planning\README.md" (
  > "planning\README.md" (
    echo # Planning
    echo.
    echo Este directorio contiene backlog, hojas de ruta y ficheros de importacion/exportacion para GitHub.
  )
  echo Creado: planning\README.md
) else (
  echo Ya existe: planning\README.md
)

REM .gitkeep para forzar carpetas vacías (opcional)
if not exist ".github\ISSUE_TEMPLATE\.gitkeep" (
  > ".github\ISSUE_TEMPLATE\.gitkeep" echo.
  echo Creado: .github\ISSUE_TEMPLATE\.gitkeep
)

if not exist "supabase\.gitkeep" (
  > "supabase\.gitkeep" echo.
  echo Creado: supabase\.gitkeep
)

if not exist "apps\.gitkeep" (
  > "apps\.gitkeep" echo.
  echo Creado: apps\.gitkeep
)

if not exist "packages\.gitkeep" (
  > "packages\.gitkeep" echo.
  echo Creado: packages\.gitkeep
)

echo.
echo ==========================================================
echo  Hecho. Ahora:
echo   1) Revisa los archivos creados
echo   2) Commit en GitHub Desktop: "chore: bootstrap folder structure"
echo   3) Push a origin
echo ==========================================================
echo.

pause
endlocal
