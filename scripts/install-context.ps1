$exe = 'C:\Users\elias\OneDrive\Desktop\EZZO Workspace\Terminal EZZO\src-tauri\target\release\ezzo-terminal.exe'

# Register for all files
New-Item -Path 'HKCU:\Software\Classes\*\shell\AbrirComEZZOTerminal' -Force | Out-Null
Set-ItemProperty -Path 'HKCU:\Software\Classes\*\shell\AbrirComEZZOTerminal' -Name '(Default)' -Value 'Abrir com EZZO Terminal'
Set-ItemProperty -Path 'HKCU:\Software\Classes\*\shell\AbrirComEZZOTerminal' -Name 'Icon' -Value $exe
New-Item -Path 'HKCU:\Software\Classes\*\shell\AbrirComEZZOTerminal\command' -Force | Out-Null
Set-ItemProperty -Path 'HKCU:\Software\Classes\*\shell\AbrirComEZZOTerminal\command' -Name '(Default)' -Value ('"' + $exe + '" "%1"')

# Register for .bat files
New-Item -Path 'HKCU:\Software\Classes\batfile\shell\AbrirComEZZOTerminal' -Force | Out-Null
Set-ItemProperty -Path 'HKCU:\Software\Classes\batfile\shell\AbrirComEZZOTerminal' -Name '(Default)' -Value 'Abrir com EZZO Terminal'
Set-ItemProperty -Path 'HKCU:\Software\Classes\batfile\shell\AbrirComEZZOTerminal' -Name 'Icon' -Value $exe
New-Item -Path 'HKCU:\Software\Classes\batfile\shell\AbrirComEZZOTerminal\command' -Force | Out-Null
Set-ItemProperty -Path 'HKCU:\Software\Classes\batfile\shell\AbrirComEZZOTerminal\command' -Name '(Default)' -Value ('"' + $exe + '" "%1"')

# Register for .cmd files
New-Item -Path 'HKCU:\Software\Classes\cmdfile\shell\AbrirComEZZOTerminal' -Force | Out-Null
Set-ItemProperty -Path 'HKCU:\Software\Classes\cmdfile\shell\AbrirComEZZOTerminal' -Name '(Default)' -Value 'Abrir com EZZO Terminal'
Set-ItemProperty -Path 'HKCU:\Software\Classes\cmdfile\shell\AbrirComEZZOTerminal' -Name 'Icon' -Value $exe
New-Item -Path 'HKCU:\Software\Classes\cmdfile\shell\AbrirComEZZOTerminal\command' -Force | Out-Null
Set-ItemProperty -Path 'HKCU:\Software\Classes\cmdfile\shell\AbrirComEZZOTerminal\command' -Name '(Default)' -Value ('"' + $exe + '" "%1"')

# Register for .ps1 files
New-Item -Path 'HKCU:\Software\Classes\Microsoft.PowerShellScript.1\shell\AbrirComEZZOTerminal' -Force | Out-Null
Set-ItemProperty -Path 'HKCU:\Software\Classes\Microsoft.PowerShellScript.1\shell\AbrirComEZZOTerminal' -Name '(Default)' -Value 'Abrir com EZZO Terminal'
Set-ItemProperty -Path 'HKCU:\Software\Classes\Microsoft.PowerShellScript.1\shell\AbrirComEZZOTerminal' -Name 'Icon' -Value $exe
New-Item -Path 'HKCU:\Software\Classes\Microsoft.PowerShellScript.1\shell\AbrirComEZZOTerminal\command' -Force | Out-Null
Set-ItemProperty -Path 'HKCU:\Software\Classes\Microsoft.PowerShellScript.1\shell\AbrirComEZZOTerminal\command' -Name '(Default)' -Value ('"' + $exe + '" "%1"')

Write-Host 'OK - Menu de contexto registado com sucesso!' -ForegroundColor Green
