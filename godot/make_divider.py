from PIL import Image, ImageDraw, ImageFilter

def draw_hud_divider(w=680, h=16):
    scale = 2
    sw, sh = w * scale, h * scale
    img = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
    glow = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    gdraw = ImageDraw.Draw(glow)

    cy = sh // 2
    x0 = 10 * scale
    x1 = sw - 10 * scale
    col = (0, 220, 255, 230)
    gcol = (0, 180, 255, 120)

    # Glow line
    gdraw.line([(x0, cy), (x1, cy)], fill=gcol, width=4 * scale)
    glow = glow.filter(ImageFilter.GaussianBlur(radius=3 * scale))

    # Core line
    draw.line([(x0, cy), (x1, cy)], fill=col, width=max(1, int(1.2 * scale)))

    # End brackets:
    # Left:
    draw.line([(x0 + 8 * scale, cy - 4 * scale), (x0, cy), (x0 + 8 * scale, cy + 4 * scale)], fill=col, width=int(1.5 * scale))
    # Right:
    draw.line([(x1 - 8 * scale, cy - 4 * scale), (x1, cy), (x1 - 8 * scale, cy + 4 * scale)], fill=col, width=int(1.5 * scale))

    # Center notch cut
    cx = sw // 2
    draw.line([(cx - 16 * scale, cy - 3 * scale), (cx - 8 * scale, cy), (cx + 8 * scale, cy), (cx + 16 * scale, cy - 3 * scale)], fill=col, width=int(1.5 * scale))

    final = Image.alpha_composite(glow, img)
    final = final.resize((w, h), Image.Resampling.LANCZOS)
    final.save("godot/assets/textures/hud_divider.png", "PNG")
    print("Saved hud_divider.png!")

draw_hud_divider(680, 16)
