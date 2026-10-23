import os
import random
import math
from PIL import Image, ImageDraw, ImageFont

out_dir = r"w:\02_Development\projects\Projects\Escape_From_Girls\godot\assets\textures"
os.makedirs(out_dir, exist_ok=True)

# 1. FLOOR TEXTURE (512x512)
img_floor = Image.new("RGB", (512, 512), "#121318")
draw = ImageDraw.Draw(img_floor)
tile_size = 64
for x in range(0, 512, tile_size):
    for y in range(0, 512, tile_size):
        shade = random.randint(18, 30)
        draw.rectangle([x + 1, y + 1, x + tile_size - 2, y + tile_size - 2], fill=(shade, shade + 2, shade + 5))
        draw.rectangle([x, y, x + tile_size, y + tile_size], outline="#08080c", width=2)
# Grime / scuffs
for _ in range(400):
    px = random.randint(0, 511)
    py = random.randint(0, 511)
    draw.rectangle([px, py, px + random.randint(1, 4), py + random.randint(1, 4)], fill=(45, 48, 55))
img_floor.save(os.path.join(out_dir, "floor.png"))

# 2. WALL TEXTURE (512x512)
img_wall = Image.new("RGB", (512, 512), "#1e222a")
draw = ImageDraw.Draw(img_wall)
# Concrete speckles
for _ in range(3000):
    px = random.randint(0, 511)
    py = random.randint(0, 511)
    v = random.randint(20, 50)
    draw.point((px, py), fill=(v, v, v))
# Hazard stripes between 420 and 460
for s in range(-512, 1024, 28):
    draw.polygon([(s, 460), (s + 14, 420), (s + 28, 420), (s + 14, 460)], fill="#ffaa00")
# Baseboard & Neon trim
draw.rectangle([0, 466, 512, 472], fill="#00f3ff")
draw.rectangle([0, 472, 512, 512], fill="#0a0c10")
draw.rectangle([0, 0, 512, 24], fill="#14171d")
img_wall.save(os.path.join(out_dir, "wall.png"))

# 3. CEILING TEXTURE (256x256)
img_ceil = Image.new("RGB", (256, 256), "#111317")
draw = ImageDraw.Draw(img_ceil)
for x in range(0, 256, 64):
    draw.line([(x, 0), (x, 256)], fill="#222730", width=2)
for y in range(0, 256, 64):
    draw.line([(0, y), (256, y)], fill="#222730", width=2)
img_ceil.save(os.path.join(out_dir, "ceiling.png"))

# 4. EXIT SIGN (512x160)
img_sign = Image.new("RGB", (512, 160), "#0a0d14")
draw = ImageDraw.Draw(img_sign)
draw.rectangle([6, 6, 505, 153], outline="#00ff88", width=6)
# Text
draw.text((256, 45), "EXIT / ESCAPE", fill="#ffffff", anchor="mm")
draw.text((256, 110), "3 KEYS REQUIRED", fill="#00ff88", anchor="mm")
img_sign.save(os.path.join(out_dir, "exit_sign.png"))

# 5. MAGMA TEXTURE (512x512)
img_magma = Image.new("RGB", (512, 512), "#880010")
draw = ImageDraw.Draw(img_magma)
for _ in range(60):
    px = random.randint(0, 511)
    py = random.randint(0, 511)
    rx = random.randint(20, 50)
    ry = random.randint(15, 35)
    draw.ellipse([px - rx, py - ry, px + rx, py + ry], fill="#280007")
for _ in range(30):
    x1 = random.randint(0, 511)
    y1 = random.randint(0, 511)
    x2 = x1 + random.randint(-60, 60)
    y2 = y1 + random.randint(-60, 60)
    draw.line([(x1, y1), (x2, y2)], fill="#ff3366", width=4)
    draw.line([(x1, y1), (x2, y2)], fill="#ff809b", width=1)
img_magma.save(os.path.join(out_dir, "magma.png"))

# 6. BASALT TEXTURE (512x512)
img_basalt = Image.new("RGB", (512, 512), "#181a1f")
draw = ImageDraw.Draw(img_basalt)
for _ in range(4000):
    px = random.randint(0, 511)
    py = random.randint(0, 511)
    v = random.randint(15, 45)
    draw.point((px, py), fill=(v, int(v * 0.95), int(v * 0.9)))
img_basalt.save(os.path.join(out_dir, "basalt.png"))

print("All textures created successfully!")
