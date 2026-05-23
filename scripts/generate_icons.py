"""
EZZO Terminal - Icon Generator
Generates all required icons from the EZZO_terminal_logo.png
"""
import os
from PIL import Image

BASE_DIR = r"C:\Users\elias\OneDrive\Desktop\EZZO Workspace\Terminal EZZO"
PUBLIC_DIR = os.path.join(BASE_DIR, "public")
ICONS_DIR = os.path.join(BASE_DIR, "src-tauri", "icons")
SRC_ASSETS_DIR = os.path.join(BASE_DIR, "src", "assets")

logo_path = os.path.join(PUBLIC_DIR, "EZZO_terminal_logo.png")
logo = Image.open(logo_path).convert("RGBA")
w, h = logo.size
print(f"Logo dimensions: {w}x{h}")

# 1. Tauri icons
icon_sizes = {
    "32x32.png": (32, 32),
    "128x128.png": (128, 128),
    "128x128@2x.png": (256, 256),
    "icon.png": (512, 512),
    "Square30x30Logo.png": (30, 30),
    "Square44x44Logo.png": (44, 44),
    "Square71x71Logo.png": (71, 71),
    "Square89x89Logo.png": (89, 89),
    "Square107x107Logo.png": (107, 107),
    "Square142x142Logo.png": (142, 142),
    "Square150x150Logo.png": (150, 150),
    "Square284x284Logo.png": (284, 284),
    "Square310x310Logo.png": (310, 310),
    "StoreLogo.png": (50, 50),
}

for name, sz in icon_sizes.items():
    path = os.path.join(ICONS_DIR, name)
    logo.resize(sz, Image.LANCZOS).save(path, "PNG")
    print(f"  OK {name} ({sz[0]}x{sz[1]})")

# 2. ICO (multi-res)
ico_path = os.path.join(ICONS_DIR, "icon.ico")
logo.resize((32, 32), Image.LANCZOS).save(
    ico_path, "ICO",
    sizes=[(32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
)
print(f"  OK icon.ico (32/48/64/128/256)")

# 3. ICNS fallback
logo.resize((256, 256), Image.LANCZOS).save(
    os.path.join(ICONS_DIR, "icon.icns"), "PNG"
)
print(f"  OK icon.icns (256x256 PNG fallback)")

# 4. Favicon (web)
favicon_path = os.path.join(PUBLIC_DIR, "favicon.ico")
logo.resize((16, 16), Image.LANCZOS).save(
    favicon_path, "ICO",
    sizes=[(16, 16), (32, 32), (48, 48)]
)
print(f"  OK favicon.ico (16/32/48)")

logo.resize((32, 32), Image.LANCZOS).save(
    os.path.join(PUBLIC_DIR, "favicon-32x32.png"), "PNG"
)
print(f"  OK favicon-32x32.png")

logo.resize((16, 16), Image.LANCZOS).save(
    os.path.join(PUBLIC_DIR, "favicon-16x16.png"), "PNG"
)
print(f"  OK favicon-16x16.png")

logo.resize((180, 180), Image.LANCZOS).save(
    os.path.join(PUBLIC_DIR, "apple-touch-icon.png"), "PNG"
)
print(f"  OK apple-touch-icon.png")

# 5. Update src/assets logo-azul.png (48px height)
if os.path.exists(SRC_ASSETS_DIR):
    aspect = w / h
    new_w = int(aspect * 48)
    logo.resize((new_w, 48), Image.LANCZOS).save(
        os.path.join(SRC_ASSETS_DIR, "logo-azul.png"), "PNG"
    )
    print(f"  OK logo-azul.png (app UI, {new_w}x48)")

print("\nAll icons generated successfully!")
