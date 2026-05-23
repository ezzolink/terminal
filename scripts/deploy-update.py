"""
EZZO Terminal - Deploy Update Script
Gera o ficheiro update.json para o GitHub Releases
"""
import json
import os
import subprocess
from datetime import datetime, timezone

# Configuracao
REPO = "ezzolink/terminal"
VERSION = "1.5.0"

update_data = {
    "version": VERSION,
    "notes": f"EZZO Terminal v{VERSION}",
    "pub_date": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "platforms": {
        "windows-x86_64": {
            "signature": "",
            "url": f"https://github.com/{REPO}/releases/download/v{VERSION}/EZZO.Terminal_{VERSION}_x64-setup.exe"
        }
    }
}

# Guardar update.json
update_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "update.json")
with open(update_path, "w", encoding="utf-8") as f:
    json.dump(update_data, f, indent=2)

print(f"update.json criado em: {update_path}")
print(f"Versao: {VERSION}")
print(f"Data: {update_data['pub_date']}")
print("\nNota: Para assinar a actualizacao, executa:")
print("  npx @tauri-apps/cli signer generate -w tauri-updater.key")
print("  npx @tauri-apps/cli signer sign -k tauri-updater.key <ficheiro.exe>")
print("\nDepois coloca a signature no update.json e faz commit + push ao repo.")
