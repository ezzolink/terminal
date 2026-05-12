@echo off
chcp 65001 >nul 2>&1
setlocal EnableDelayedExpansion
for /f "delims=" %%a in ('echo prompt $E ^| cmd') do set "ESC=%%a"

title EZZO Terminal - Instalar Menu de Contexto
cls

echo.
echo %ESC%[1;36m  ========================================================%ESC%[0m
echo %ESC%[1;32m       E Z Z O   T E R M I N A L   -   Menu de Contexto%ESC%[0m
echo %ESC%[1;36m  ========================================================%ESC%[0m
echo.

:: ─── Detectar caminho do executável ───
set "EZZO_HOME=%~dp0.."
pushd "%EZZO_HOME%"
set "EZZO_HOME=%CD%"
popd

set "EZZO_EXE=%EZZO_HOME%\src-tauri\target\release\ezzo-terminal.exe"

echo %ESC%[1;35m  [1/2] Verificando executavel do EZZO Terminal...%ESC%[0m
if exist "%EZZO_EXE%" (
    echo %ESC%[1;32m  [OK] EZZO Terminal encontrado em:%ESC%[0m
    echo %ESC%[0m       %EZZO_EXE%%ESC%[0m
) else (
    echo %ESC%[1;31m  [ERRO] EZZO Terminal nao encontrado!%ESC%[0m
    echo %ESC%[0m       Compila primeiro com: npm run tauri build%ESC%[0m
    echo %ESC%[0m       Caminho esperado: %EZZO_EXE%%ESC%[0m
    echo.
    pause
    exit /b 1
)
echo.

echo %ESC%[1;35m  [2/2] Registando "Abrir com EZZO Terminal" no menu de contexto...%ESC%[0m

:: Criar .reg temporario com caminhos correctos
set "REG_FILE=%TEMP%\ezzo_terminal_context.reg"
set "EXE_PATH=%EZZO_EXE:\=\\%"

(
echo Windows Registry Editor Version 5.00
echo.
echo ;; ─── Abrir com EZZO Terminal (todos os ficheiros) ───
echo [HKEY_CURRENT_USER\Software\Classes\*\shell\AbrirComEZZOTerminal]
echo @="Abrir com EZZO Terminal"
echo "Icon"="\"%EXE_PATH%\""
echo.
echo [HKEY_CURRENT_USER\Software\Classes\*\shell\AbrirComEZZOTerminal\command]
echo @="\"%EXE_PATH%\" \"%%1\""
echo.
echo ;; ─── Abrir com EZZO Terminal (ficheiros .bat) ───
echo [HKEY_CURRENT_USER\Software\Classes\batfile\shell\AbrirComEZZOTerminal]
echo @="Abrir com EZZO Terminal"
echo "Icon"="\"%EXE_PATH%\""
echo.
echo [HKEY_CURRENT_USER\Software\Classes\batfile\shell\AbrirComEZZOTerminal\command]
echo @="\"%EXE_PATH%\" \"%%1\""
echo.
echo ;; ─── Abrir com EZZO Terminal (ficheiros .cmd) ───
echo [HKEY_CURRENT_USER\Software\Classes\cmdfile\shell\AbrirComEZZOTerminal]
echo @="Abrir com EZZO Terminal"
echo "Icon"="\"%EXE_PATH%\""
echo.
echo [HKEY_CURRENT_USER\Software\Classes\cmdfile\shell\AbrirComEZZOTerminal\command]
echo @="\"%EXE_PATH%\" \"%%1\""
echo.
echo ;; ─── Abrir com EZZO Terminal (ficheiros .ps1) ───
echo [HKEY_CURRENT_USER\Software\Classes\Microsoft.PowerShellScript.1\shell\AbrirComEZZOTerminal]
echo @="Abrir com EZZO Terminal"
echo "Icon"="\"%EXE_PATH%\""
echo.
echo [HKEY_CURRENT_USER\Software\Classes\Microsoft.PowerShellScript.1\shell\AbrirComEZZOTerminal\command]
echo @="\"%EXE_PATH%\" \"%%1\""
echo.
echo ;; ─── Abrir com EZZO Terminal (ficheiros .sh) ───
echo [HKEY_CURRENT_USER\Software\Classes\sh_auto_file\shell\AbrirComEZZOTerminal]
echo @="Abrir com EZZO Terminal"
echo "Icon"="\"%EXE_PATH%\""
echo.
echo [HKEY_CURRENT_USER\Software\Classes\sh_auto_file\shell\AbrirComEZZOTerminal\command]
echo @="\"%EXE_PATH%\" \"%%1\""
) > "%REG_FILE%"

:: Importar o registo
reg import "%REG_FILE%" >nul 2>&1
if %ERRORLEVEL%==0 (
    echo %ESC%[1;32m  [OK] Menu de contexto registado com sucesso!%ESC%[0m
    echo.
    echo %ESC%[0m  Agora podes clicar com o botao direito em:%ESC%[0m
    echo %ESC%[1;33m    .bat  .cmd  .ps1  .sh  ou qualquer ficheiro%ESC%[0m
    echo %ESC%[0m  e selecionar "Abrir com EZZO Terminal"%ESC%[0m
) else (
    echo %ESC%[1;31m  [ERRO] Falha ao registar menu de contexto.%ESC%[0m
    echo %ESC%[0m       Tenta executar como administrador.%ESC%[0m
)

:: Limpar temporario
del "%REG_FILE%" >nul 2>&1

echo.
echo %ESC%[1;36m  ========================================================%ESC%[0m
echo %ESC%[1;32m       Instalacao concluida!%ESC%[0m
echo %ESC%[1;36m  ========================================================%ESC%[0m
echo.
pause
endlocal
