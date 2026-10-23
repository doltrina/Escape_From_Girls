import math
from PIL import Image, ImageDraw, ImageFilter

def draw_hud_bracket_button(
    w=360, h=52,
    bracket_color=(0, 229, 255, 255),
    glow_color=(0, 180, 255, 120),
    fill_color=(6, 12, 20, 180),
    is_red=False,
    is_hover=False
):
    # Render at 2x scale for crisp anti-aliasing
    scale = 2
    sw, sh = w * scale, h * scale
    img = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
    glow_img = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    glow_draw = ImageDraw.Draw(glow_img)

    pad = 8 * scale
    x0, y0 = pad, pad
    x1, y1 = sw - pad, sh - pad
    corner_cut = 10 * scale
    bracket_w = 16 * scale
    line_w = max(2, int(2.2 * scale))

    # Inner glass body
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
    draw.polygon(body_poly, fill=fill_color)

    # Brackets path:
    # Left bracket [
    left_bracket = [
        (x0 + bracket_w, y0),
        (x0 + corner_cut, y0),
        (x0, y0 + corner_cut),
        (x0, y1 - corner_cut),
        (x0 + corner_cut, y1),
        (x0 + bracket_w, y1)
    ]

    # Right bracket ]
    right_bracket = [
        (x1 - bracket_w, y0),
        (x1 - corner_cut, y0),
        (x1, y0 + corner_cut),
        (x1, y1 - corner_cut),
        (x1 - corner_cut, y1),
        (x1 - bracket_w, y1)
    ]

    # Draw glow layer
    glow_line_w = line_w + (6 * scale if is_hover else 4 * scale)
    glow_draw.line(left_bracket, fill=glow_color, width=glow_line_w, joint="curve")
    glow_draw.line(right_bracket, fill=glow_color, width=glow_line_w, joint="curve")

    # Top/Bottom connecting thin lines
    top_line = [(x0 + bracket_w + 10 * scale, y0), (x1 - bracket_w - 10 * scale, y0)]
    bot_line = [(x0 + bracket_w + 10 * scale, y1), (x1 - bracket_w - 10 * scale, y1)]
    glow_draw.line(top_line, fill=(glow_color[0], glow_color[1], glow_color[2], glow_color[3] // 2), width=line_w + 2 * scale)
    glow_draw.line(bot_line, fill=(glow_color[0], glow_color[1], glow_color[2], glow_color[3] // 2), width=line_w + 2 * scale)

    # Blur glow layer
    glow_img = glow_img.filter(ImageFilter.GaussianBlur(radius=3 * scale if not is_hover else 5 * scale))

    # Draw crisp core lines
    draw.line(left_bracket, fill=bracket_color, width=line_w, joint="curve")
    draw.line(right_bracket, fill=bracket_color, width=line_w, joint="curve")
    
    thin_edge_col = (bracket_color[0], bracket_color[1], bracket_color[2], int(bracket_color[3] * 0.55))
    draw.line(top_line, fill=thin_edge_col, width=max(1, int(1.2 * scale)))
    draw.line(bot_line, fill=thin_edge_col, width=max(1, int(1.2 * scale)))

    # Tech notch accents
    notch_col = (255, 255, 255, 220) if is_hover else bracket_color
    # Small top tick
    draw.line([(x0 + bracket_w + 2 * scale, y0 - 3 * scale), (x0 + bracket_w + 2 * scale, y0 + 3 * scale)], fill=notch_col, width=int(1.5 * scale))
    draw.line([(x1 - bracket_w - 2 * scale, y0 - 3 * scale), (x1 - bracket_w - 2 * scale, y0 + 3 * scale)], fill=notch_col, width=int(1.5 * scale))
    draw.line([(x0 + bracket_w + 2 * scale, y1 - 3 * scale), (x0 + bracket_w + 2 * scale, y1 + 3 * scale)], fill=notch_col, width=int(1.5 * scale))
    draw.line([(x1 - bracket_w - 2 * scale, y1 - 3 * scale), (x1 - bracket_w - 2 * scale, y1 + 3 * scale)], fill=notch_col, width=int(1.5 * scale))

    # Composite glow and crisp image
    final = Image.alpha_composite(glow_img, img)
    final = final.resize((w, h), Image.Resampling.LANCZOS)
    return final

# 1. Primary Red Button (Normal)
btn_red_norm = draw_hud_bracket_button(
    w=360, h=52,
    bracket_color=(255, 55, 90, 255),
    glow_color=(255, 25, 75, 140),
    fill_color=(20, 8, 14, 190),
    is_red=True,
    is_hover=False
)
btn_red_norm.save("godot/assets/textures/hud_btn_red_norm.png", "PNG")

# 2. Primary Red Button (Hover)
btn_red_hover = draw_hud_bracket_button(
    w=360, h=52,
    bracket_color=(255, 120, 150, 255),
    glow_color=(255, 45, 95, 220),
    fill_color=(45, 12, 22, 225),
    is_red=True,
    is_hover=True
)
btn_red_hover.save("godot/assets/textures/hud_btn_red_hover.png", "PNG")

# 3. Cyan Button (Normal)
btn_cyan_norm = draw_hud_bracket_button(
    w=360, h=52,
    bracket_color=(0, 230, 255, 255),
    glow_color=(0, 170, 255, 130),
    fill_color=(6, 12, 20, 190),
    is_red=False,
    is_hover=False
)
btn_cyan_norm.save("godot/assets/textures/hud_btn_cyan_norm.png", "PNG")

# 4. Cyan Button (Hover)
btn_cyan_hover = draw_hud_bracket_button(
    w=360, h=52,
    bracket_color=(120, 250, 255, 255),
    glow_color=(0, 215, 255, 220),
    fill_color=(10, 28, 42, 225),
    is_red=False,
    is_hover=True
)
btn_cyan_hover.save("godot/assets/textures/hud_btn_cyan_hover.png", "PNG")

# 5. Pressed states
btn_cyan_press = draw_hud_bracket_button(
    w=360, h=52,
    bracket_color=(255, 255, 255, 255),
    glow_color=(0, 240, 255, 240),
    fill_color=(15, 45, 65, 240),
    is_red=False,
    is_hover=True
)
btn_cyan_press.save("godot/assets/textures/hud_btn_cyan_press.png", "PNG")

btn_red_press = draw_hud_bracket_button(
    w=360, h=52,
    bracket_color=(255, 255, 255, 255),
    glow_color=(255, 80, 120, 240),
    fill_color=(65, 18, 30, 240),
    is_red=True,
    is_hover=True
)
btn_red_press.save("godot/assets/textures/hud_btn_red_press.png", "PNG")

# 6. Red Close Button with Hazard Stripes (Normal & Hover)
def draw_close_red_button(w=220, h=44, is_hover=False):
    scale = 2
    sw, sh = w * scale, h * scale
    img = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
    glow_img = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    glow_draw = ImageDraw.Draw(glow_img)

    pad = 5 * scale
    x0, y0 = pad, pad
    x1, y1 = sw - pad, sh - pad
    corner_cut = 7 * scale
    bracket_w = 16 * scale
    line_w = max(2, int(2.2 * scale))

    fill_col = (45, 12, 20, 220) if is_hover else (25, 8, 14, 185)
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

    bracket_col = (255, 110, 140, 255) if is_hover else (255, 50, 80, 255)
    glow_col = (255, 50, 90, 220) if is_hover else (240, 30, 70, 140)

    left_b = [(x0 + bracket_w, y0), (x0 + corner_cut, y0), (x0, y0 + corner_cut), (x0, y1 - corner_cut), (x0 + corner_cut, y1), (x0 + bracket_w, y1)]
    right_b = [(x1 - bracket_w, y0), (x1 - corner_cut, y0), (x1, y0 + corner_cut), (x1, y1 - corner_cut), (x1 - corner_cut, y1), (x1 - bracket_w, y1)]

    glow_draw.line(left_b, fill=glow_col, width=line_w + (5 * scale if is_hover else 3 * scale))
    glow_draw.line(right_b, fill=glow_col, width=line_w + (5 * scale if is_hover else 3 * scale))

    top_l = [(x0 + bracket_w + 8 * scale, y0), (x1 - bracket_w - 8 * scale, y0)]
    bot_l = [(x0 + bracket_w + 8 * scale, y1), (x1 - bracket_w - 8 * scale, y1)]
    glow_draw.line(top_l, fill=glow_col, width=line_w + 2 * scale)
    glow_draw.line(bot_l, fill=glow_col, width=line_w + 2 * scale)

    glow_img = glow_img.filter(ImageFilter.GaussianBlur(radius=3 * scale if not is_hover else 4 * scale))

    draw.line(left_b, fill=bracket_col, width=line_w)
    draw.line(right_b, fill=bracket_col, width=line_w)
    draw.line(top_l, fill=bracket_col, width=max(1, int(1.2 * scale)))
    draw.line(bot_l, fill=bracket_col, width=max(1, int(1.2 * scale)))

    # Diagonal hazard stripes inside brackets
    for k in range(3):
        sx = x0 + (5 + k * 3.5) * scale
        draw.line([(sx, y1 - 3 * scale), (sx + 3 * scale, y0 + 3 * scale)], fill=bracket_col, width=int(1.2 * scale))
        rx = x1 - (5 + k * 3.5) * scale
        draw.line([(rx, y1 - 3 * scale), (rx - 3 * scale, y0 + 3 * scale)], fill=bracket_col, width=int(1.2 * scale))

    final = Image.alpha_composite(glow_img, img)
    final = final.resize((w, h), Image.Resampling.LANCZOS)
    return final

btn_close_norm = draw_close_red_button(220, 44, False)
btn_close_norm.save("godot/assets/textures/hud_btn_close_norm.png", "PNG")

btn_close_hover = draw_close_red_button(220, 44, True)
btn_close_hover.save("godot/assets/textures/hud_btn_close_hover.png", "PNG")

print("Generated all HUD bracket button textures successfully!")
