@echo off
set "EXE=C:\Users\elias\OneDrive\Desktop\EZZO Workspace\Terminal EZZO\src-tauri\target\release\ezzo-terminal.exe"

reg add "HKCU\Software\Classes\*\shell\AbrirComEZZOTerminal" /ve /d "Abrir com EZZO Terminal" /f
reg add "HKCU\Software\Classes\*\shell\AbrirComEZZOTerminal" /v "Icon" /d "\"%EXE%\"" /f
reg add "HKCU\Software\Classes\*\shell\AbrirComEZZOTerminal\command" /ve /d "\"%EXE%\" \"%%1\"" /f

reg add "HKCU\Software\Classes\batfile\shell\AbrirComEZZOTerminal" /ve /d "Abrir com EZZO Terminal" /f
reg add "HKCU\Software\Classes\batfile\shell\AbrirComEZZOTerminal" /v "Icon" /d "\"%EXE%\"" /f
reg add "HKCU\Software\Classes\batfile\shell\AbrirComEZZOTerminal\command" /ve /d "\"%EXE%\" \"%%1\"" /f

reg add "HKCU\Software\Classes\cmdfile\shell\AbrirComEZZOTerminal" /ve /d "Abrir com EZZO Terminal" /f
reg add "HKCU\Software\Classes\cmdfile\shell\AbrirComEZZOTerminal" /v "Icon" /d "\"%EXE%\"" /f
reg add "HKCU\Software\Classes\cmdfile\shell\AbrirComEZZOTerminal\command" /ve /d "\"%EXE%\" \"%%1\"" /f

reg add "HKCU\Software\Classes\Microsoft.PowerShellScript.1\shell\AbrirComEZZOTerminal" /ve /d "Abrir com EZZO Terminal" /f
reg add "HKCU\Software\Classes\Microsoft.PowerShellScript.1\shell\AbrirComEZZOTerminal" /v "Icon" /d "\"%EXE%\"" /f
reg add "HKCU\Software\Classes\Microsoft.PowerShellScript.1\shell\AbrirComEZZOTerminal\command" /ve /d "\"%EXE%\" \"%%1\"" /f

echo.
echo Menu de contexto registado com sucesso!
