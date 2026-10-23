import math
from PIL import Image, ImageDraw, ImageFilter, ImageFont

# =========================================================================
# 1. GENERATE SCI-FI FROSTED GLASS TERMINAL FRAME (800 x 560)
# =========================================================================
def generate_glass_frame(w=800, h=560):
    scale = 2
    sw, sh = w * scale, h * scale
    img = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
    glow_img = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    glow_draw = ImageDraw.Draw(glow_img)

    pad = 12 * scale
    x0, y0 = pad, pad
    x1, y1 = sw - pad, sh - pad
    chamfer = 24 * scale

    # Outer polygon with chamfered 45-degree corners
    outer_poly = [
        (x0 + chamfer, y0),
        (x1 - chamfer, y0),
        (x1, y0 + chamfer),
        (x1, y1 - chamfer),
        (x1 - chamfer, y1),
        (x0 + chamfer, y1),
        (x0, y1 - chamfer),
        (x0, y0 + chamfer)
    ]

    # Glass body fill (dark translucent cyan-tinted glass)
    draw.polygon(outer_poly, fill=(8, 18, 30, 215))

    # Glowing outer border
    border_col = (0, 220, 255, 255)
    glow_col = (0, 160, 255, 140)

    glow_draw.polygon(outer_poly, outline=glow_col, width=6 * scale)
    glow_img = glow_img.filter(ImageFilter.GaussianBlur(radius=4 * scale))

    # Crisp metallic border
    draw.polygon(outer_poly, outline=border_col, width=int(2.5 * scale))

    # Inner decorative thin tech border (inset by 8px)
    inset = 7 * scale
    inner_poly = [
        (x0 + chamfer + inset, y0 + inset),
        (x1 - chamfer - inset, y0 + inset),
        (x1 - inset, y0 + chamfer + inset),
        (x1 - inset, y1 - chamfer - inset),
        (x1 - chamfer - inset, y1 - inset),
        (x0 + chamfer + inset, y1 - inset),
        (x0 + inset, y1 - chamfer - inset),
        (x0 + inset, y0 + chamfer + inset)
    ]
    draw.polygon(inner_poly, outline=(0, 200, 240, 75), width=max(1, int(1.2 * scale)))

    # Tech brackets & notch tabs on corners
    tab_len = 36 * scale
    tab_w = 4 * scale
    # Top-left corner bracket
    draw.line([(x0, y0 + chamfer + tab_len), (x0, y0 + chamfer), (x0 + chamfer, y0), (x0 + chamfer + tab_len, y0)], fill=(0, 255, 255, 255), width=tab_w)
    # Top-right corner bracket
    draw.line([(x1 - chamfer - tab_len, y0), (x1 - chamfer, y0), (x1, y0 + chamfer), (x1, y0 + chamfer + tab_len)], fill=(0, 255, 255, 255), width=tab_w)
    # Bottom-left corner bracket
    draw.line([(x0, y1 - chamfer - tab_len), (x0, y1 - chamfer), (x0 + chamfer, y1), (x0 + chamfer + tab_len, y1)], fill=(0, 255, 255, 255), width=tab_w)
    # Bottom-right corner bracket
    draw.line([(x1 - chamfer - tab_len, y1), (x1 - chamfer, y1), (x1, y1 - chamfer), (x1, y1 - chamfer - tab_len)], fill=(0, 255, 255, 255), width=tab_w)

    # Screws / Rivets near corners
    def draw_rivet(cx, cy):
        r = 3.5 * scale
        draw.ellipse([(cx - r, cy - r), (cx + r, cy + r)], fill=(15, 35, 50, 255), outline=(0, 220, 255, 220), width=int(1.2 * scale))
        draw.line([(cx - r*0.6, cy), (cx + r*0.6, cy)], fill=(0, 240, 255, 255), width=int(1 * scale))

    r_off = 22 * scale
    draw_rivet(x0 + r_off, y0 + r_off)
    draw_rivet(x1 - r_off, y0 + r_off)
    draw_rivet(x0 + r_off, y1 - r_off)
    draw_rivet(x1 - r_off, y1 - r_off)

    # Top & bottom tech notch markers (stripes)
    mid_x = sw // 2
    for offset_x in [-80 * scale, -40 * scale, 40 * scale, 80 * scale]:
        draw.line([(mid_x + offset_x, y0 - 2 * scale), (mid_x + offset_x, y0 + 4 * scale)], fill=(0, 255, 255, 200), width=int(1.5 * scale))
        draw.line([(mid_x + offset_x, y1 - 4 * scale), (mid_x + offset_x, y1 + 2 * scale)], fill=(0, 255, 255, 200), width=int(1.5 * scale))

    # Composite glow and crisp frame
    final = Image.alpha_composite(glow_img, img)
    final = final.resize((w, h), Image.Resampling.LANCZOS)
    return final

# =========================================================================
# 2. GENERATE AMBER HUD BRACKET BUTTON (for Settings Preset Button)
# =========================================================================
def draw_amber_bracket_button(w=440, h=48, is_hover=False):
    scale = 2
    sw, sh = w * scale, h * scale
    img = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
    glow_img = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    glow_draw = ImageDraw.Draw(glow_img)

    pad = 6 * scale
    x0, y0 = pad, pad
    x1, y1 = sw - pad, sh - pad
    corner_cut = 8 * scale
    bracket_w = 20 * scale
    line_w = max(2, int(2.2 * scale))

    # Inner glass body (translucent amber)
    fill_col = (45, 22, 6, 230) if is_hover else (30, 14, 5, 195)
    body_poly = [
        (x0 + corner_cut, y0),
        (x1 - corner_cut, y0),
        (x1, y0 + corner_cut),
        (x1, y1 - corner_cut),
        (x1 - corner_cut, y1),
        (x0 + corner_cut, y1),
        (x0, y1 - corner_cut),
        (x0, y0 + corner_cut)
    ]
    draw.polygon(body_poly, fill=fill_col)

    bracket_col = (255, 190, 50, 255) if is_hover else (255, 160, 25, 255)
    glow_col = (255, 150, 20, 220) if is_hover else (240, 120, 10, 140)

    # Left & Right bracket paths
    left_b = [(x0 + bracket_w, y0), (x0 + corner_cut, y0), (x0, y0 + corner_cut), (x0, y1 - corner_cut), (x0 + corner_cut, y1), (x0 + bracket_w, y1)]
    right_b = [(x1 - bracket_w, y0), (x1 - corner_cut, y0), (x1, y0 + corner_cut), (x1, y1 - corner_cut), (x1 - corner_cut, y1), (x1 - bracket_w, y1)]

    glow_draw.line(left_b, fill=glow_col, width=line_w + (6 * scale if is_hover else 3 * scale))
    glow_draw.line(right_b, fill=glow_col, width=line_w + (6 * scale if is_hover else 3 * scale))

    top_line = [(x0 + bracket_w + 14 * scale, y0), (x1 - bracket_w - 14 * scale, y0)]
    bot_line = [(x0 + bracket_w + 14 * scale, y1), (x1 - bracket_w - 14 * scale, y1)]
    glow_draw.line(top_line, fill=glow_col, width=line_w + 2 * scale)
    glow_draw.line(bot_line, fill=glow_col, width=line_w + 2 * scale)

    glow_img = glow_img.filter(ImageFilter.GaussianBlur(radius=3 * scale if not is_hover else 5 * scale))

    # Crisp lines
    draw.line(left_b, fill=bracket_col, width=line_w)
    draw.line(right_b, fill=bracket_col, width=line_w)
    draw.line(top_line, fill=bracket_col, width=max(1, int(1.4 * scale)))
    draw.line(bot_line, fill=bracket_col, width=max(1, int(1.4 * scale)))

    # Diagonal hazard stripes inside brackets (matching reference ///)
    for k in range(4):
        sx = x0 + (6 + k * 3.5) * scale
        draw.line([(sx, y1 - 4 * scale), (sx + 3 * scale, y0 + 4 * scale)], fill=bracket_col, width=int(1.2 * scale))
        rx = x1 - (6 + k * 3.5) * scale
        draw.line([(rx, y1 - 4 * scale), (rx - 3 * scale, y0 + 4 * scale)], fill=bracket_col, width=int(1.2 * scale))

    final = Image.alpha_composite(glow_img, img)
    final = final.resize((w, h), Image.Resampling.LANCZOS)
    return final

# =========================================================================
# 3. GENERATE SLIDER GRABBER (Glowing Cyan/White Orb)
# =========================================================================
def generate_slider_grabber(size=24):
    scale = 3
    ss = size * scale
    img = Image.new("RGBA", (ss, ss), (0, 0, 0, 0))
    glow = Image.new("RGBA", (ss, ss), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    gdraw = ImageDraw.Draw(glow)

    cx, cy = ss // 2, ss // 2
    r_glow = 9 * scale
    r_core = 5 * scale

    gdraw.ellipse([(cx - r_glow, cy - r_glow), (cx + r_glow, cy + r_glow)], fill=(0, 220, 255, 180))
    glow = glow.filter(ImageFilter.GaussianBlur(radius=3 * scale))

    draw.ellipse([(cx - r_core - 1, cy - r_core - 1), (cx + r_core + 1, cy + r_core + 1)], fill=(0, 240, 255, 255))
    draw.ellipse([(cx - r_core + 1, cy - r_core + 1), (cx + r_core - 1, cy + r_core - 1)], fill=(255, 255, 255, 255))

    final = Image.alpha_composite(glow, img)
    final = final.resize((size, size), Image.Resampling.LANCZOS)
    return final

# =========================================================================
# 4. GENERATE GLOWING RED EYES FLARE TEXTURE
# =========================================================================
def generate_eyes_flare(w=80, h=36):
    scale = 3
    sw, sh = w * scale, h * scale
    img = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Two eye centers
    # Eye distance ~13px in 1280 screen -> ~28px in this 80px sprite
    cy = sh // 2
    e1_x = sw // 2 - 13 * scale
    e2_x = sw // 2 + 13 * scale

    for ex in [e1_x, e2_x]:
        # Multi-layer intense red and white flare
        for r, alpha in [(16 * scale, 35), (10 * scale, 80), (6 * scale, 170), (3 * scale, 240)]:
            draw.ellipse([(ex - r, cy - r*0.65), (ex + r, cy + r*0.65)], fill=(255, 10, 40, alpha))
        # Hot core
        draw.ellipse([(ex - 1.8 * scale, cy - 1.2 * scale), (ex + 1.8 * scale, cy + 1.2 * scale)], fill=(255, 230, 240, 255))

    img = img.filter(ImageFilter.GaussianBlur(radius=1.5 * scale))
    final = img.resize((w, h), Image.Resampling.LANCZOS)
    return final

# Run and save
glass_frame = generate_glass_frame(800, 560)
glass_frame.save("godot/assets/textures/glass_frame.png", "PNG")

btn_amber_norm = draw_amber_bracket_button(440, 48, False)
btn_amber_norm.save("godot/assets/textures/hud_btn_amber_norm.png", "PNG")

btn_amber_hover = draw_amber_bracket_button(440, 48, True)
btn_amber_hover.save("godot/assets/textures/hud_btn_amber_hover.png", "PNG")

grabber = generate_slider_grabber(24)
grabber.save("godot/assets/textures/hud_slider_grabber.png", "PNG")

eyes_flare = generate_eyes_flare(80, 36)
eyes_flare.save("godot/assets/textures/girl_eyes_flare.png", "PNG")

print("Generated glass_frame, amber buttons, slider grabber, and eyes flare successfully!")
