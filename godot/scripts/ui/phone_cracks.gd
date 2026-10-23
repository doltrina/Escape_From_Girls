extends Control

# Procedural high-contrast realistic cracked glass overlay for phone screen
var is_cracked: bool = false
var crack_lines: Array = []
var sub_branches: Array = []
var rings: Array = []
var glitch_lines: Array = []
var loaded_texture: Texture2D = null

func _ready() -> void:
	visible = false
	# Try to load PNG image if available
	var global_path = ProjectSettings.globalize_path("res://assets/textures/phone_cracks_bold.png")
	if FileAccess.file_exists(global_path):
		var img = Image.new()
		if img.load(global_path) == OK:
			loaded_texture = ImageTexture.create_from_image(img)
	generate_cracks()

func generate_cracks() -> void:
	var screen_w: float = 246.0
	var screen_h: float = 362.0
	var cx = screen_w * 0.5 # center of phone screen
	var cy = screen_h * 0.52 # impact center
	var rng = RandomNumberGenerator.new()
	rng.seed = 777

	# 1. Main radial cracks (strictly clamped to screen bounds)
	crack_lines.clear()
	sub_branches.clear()
	for i in range(24):
		var angle = (float(i) / 24.0) * TAU + rng.randf_range(-0.12, 0.12)
		var length = rng.randf_range(80.0, 180.0)
		var cur = Vector2(cx, cy)
		var dist: float = 0.0
		var pts: Array[Vector2] = [cur]
		while dist < length:
			var step = rng.randf_range(10.0, 22.0)
			dist += step
			angle += rng.randf_range(-0.25, 0.25)
			var nxt = cur + Vector2(cos(angle), sin(angle)) * step
			var clamped_x = clampf(nxt.x, 2.0, screen_w - 2.0)
			var clamped_y = clampf(nxt.y, 2.0, screen_h - 2.0)
			var clamped_nxt = Vector2(clamped_x, clamped_y)
			pts.append(clamped_nxt)
			if nxt != clamped_nxt:
				break
			if rng.randf() < 0.35 and dist > 25.0:
				var ba = angle + (0.75 if rng.randf() > 0.5 else -0.75) + rng.randf_range(-0.2, 0.2)
				var bl = rng.randf_range(10.0, 32.0)
				var end_pt = clamped_nxt + Vector2(cos(ba), sin(ba)) * bl
				end_pt.x = clampf(end_pt.x, 2.0, screen_w - 2.0)
				end_pt.y = clampf(end_pt.y, 2.0, screen_h - 2.0)
				sub_branches.append([clamped_nxt, end_pt])
			cur = clamped_nxt
		crack_lines.append(pts)

	# 2. Concentric shatter rings (strictly clamped to screen bounds)
	rings.clear()
	for radius in [16.0, 34.0, 58.0, 85.0, 115.0]:
		var r_pts: Array[Vector2] = []
		var count = 28
		for j in range(count + 1):
			var a = (float(j) / float(count)) * TAU
			var r_jit = radius + rng.randf_range(-3.0, 3.0)
			var pt = Vector2(cx, cy) + Vector2(cos(a), sin(a)) * r_jit
			pt.x = clampf(pt.x, 2.0, screen_w - 2.0)
			pt.y = clampf(pt.y, 2.0, screen_h - 2.0)
			r_pts.append(pt)
		rings.append(r_pts)

	# 3. AMOLED Glitch lines
	glitch_lines.clear()
	for _k in range(5):
		var gx = rng.randf_range(12.0, screen_w - 12.0)
		var col = Color(0.0, 1.0, 0.8, 0.75) if rng.randf() > 0.5 else Color(1.0, 0.15, 0.6, 0.75)
		glitch_lines.append({"x": gx, "color": col, "w": rng.randf_range(1.5, 3.0)})

func show_cracks() -> void:
	is_cracked = true
	visible = true
	queue_redraw()

func _draw() -> void:
	if not visible:
		return

	# Glass fracture dark-light glitch tint across screen to clearly show screen damage
	draw_rect(Rect2(Vector2.ZERO, size), Color(0.0, 0.06, 0.15, 0.42))

	# Draw image texture if loaded
	if loaded_texture:
		draw_texture_rect(loaded_texture, Rect2(Vector2.ZERO, size), false)

	# Draw sharp high-contrast vector cracks directly via 2D canvas
	var impact_center = Vector2(135.0, 190.0)
	
	# Dead pixel impact hole
	draw_circle(impact_center, 22.0, Color(0.02, 0.03, 0.06, 0.95))
	draw_circle(impact_center, 14.0, Color(1.0, 1.0, 1.0, 0.95))
	draw_circle(impact_center, 7.0, Color(0.0, 0.0, 0.0, 1.0))

	# AMOLED vertical glitch lines
	for g in glitch_lines:
		draw_line(Vector2(g["x"], 0.0), Vector2(g["x"], size.y), g["color"], g["w"])

	# Draw radial cracks
	for pts in crack_lines:
		for k in range(pts.size() - 1):
			var dist = (pts[k] - impact_center).length()
			var width = 3.5 if dist < 50.0 else (2.0 if dist < 120.0 else 1.2)
			# Glow backing
			draw_line(pts[k], pts[k+1], Color(0.6, 0.85, 1.0, 0.45), width + 2.0)
			# Sharp white core crack
			draw_line(pts[k], pts[k+1], Color(1.0, 1.0, 1.0, 0.95), width)

	# Draw branch cracks
	for br in sub_branches:
		draw_line(br[0], br[1], Color(0.7, 0.9, 1.0, 0.35), 2.5)
		draw_line(br[0], br[1], Color(1.0, 1.0, 1.0, 0.9), 1.2)

	# Draw shatter rings
	for r_pts in rings:
		for m in range(r_pts.size() - 1):
			draw_line(r_pts[m], r_pts[m+1], Color(1.0, 1.0, 1.0, 0.85), 1.5)
