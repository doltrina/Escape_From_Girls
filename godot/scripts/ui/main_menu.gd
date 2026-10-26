extends Control

@onready var btn_play: Button = find_child("BtnPlay", true, false)
@onready var btn_map: Button = find_child("BtnMap", true, false)
@onready var btn_preset: Button = find_child("BtnPreset", true, false)
@onready var speed_slider: HSlider = find_child("SpeedSlider", true, false)
@onready var speed_label: Label = find_child("SpeedLabel", true, false)
@onready var btn_controls: Button = find_child("BtnControls", true, false)
@onready var btn_quit: Button = find_child("BtnQuit", true, false)
@onready var highscore_label: Label = find_child("HighScoreLabel", true, false)
@onready var controls_popup: Control = find_child("ControlsPopup", true, false)
@onready var btn_close_controls: Button = find_child("BtnClose", true, false)
@onready var parallax_container: Control = find_child("ParallaxContainer", true, false)
@onready var background_rect: TextureRect = find_child("Background", true, false)
@onready var corridor_smoke: ColorRect = find_child("CorridorSmoke", true, false)
@onready var smoke_particles: CPUParticles2D = find_child("SmokeParticles", true, false)
@onready var kanji_sparks: CPUParticles2D = find_child("KanjiSparks", true, false)
@onready var exit_sparks: CPUParticles2D = find_child("ExitSparks", true, false)
@onready var girl_eyes: TextureRect = find_child("GirlEyesFlare", true, false)
@onready var logo_rect: TextureRect = find_child("Logo", true, false)
@onready var title_box: VBoxContainer = find_child("TitleBox", true, false)
@onready var buttons_container: VBoxContainer = find_child("ButtonsContainer", true, false)

var selected_map: GameManager.MapType = GameManager.MapType.MAZE

# Eyes animation variables
var eye_time: float = 0.0
var next_blink_time: float = 3.2
var is_blinking: bool = false
var blink_timer: float = 0.0

# Glitch shader variables
var glitch_timer: float = 2.0
var glitch_active: bool = false
var glitch_duration: float = 0.0

# Mouse parallax variables
var mouse_parallax: Vector2 = Vector2.ZERO
var target_parallax: Vector2 = Vector2.ZERO
var base_parallax_pos: Vector2 = Vector2(-35.0, -25.0)

# Neon signs simulation
class NeonSign:
	var name: String = ""
	var intensity: float = 1.0
	var base_intensity: float = 1.0
	var pulse_speed: float = 2.0
	var pulse_amp: float = 0.15
	var pulse_phase: float = 0.0

	enum State { NORMAL, FLICKER, BURNOUT, RESTART }
	var state: State = State.NORMAL
	var state_timer: float = 0.0
	var next_event_timer: float = 5.0
	var can_burn_out: bool = true
	var restart_step: int = 0
	var spark_node: CPUParticles2D = null
	var flicker_subtimer: float = 0.0

var signs: Array[NeonSign] = []

func _ready() -> void:
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	GameManager.change_state(GameManager.GameState.MENU)
	SoundManager.start_menu_ambience()

	if parallax_container:
		base_parallax_pos = parallax_container.position

	# Background texture is assigned directly in the scene (menu_bg.jpg)
	if background_rect and not background_rect.texture:
		var tex = load("res://assets/textures/menu_bg.jpg")
		if not tex:
			tex = load("res://assets/textures/menu_bg.png")
		if tex:
			background_rect.texture = tex

	if highscore_label:
		if GameManager.high_score > 0.0:
			highscore_label.text = "🏆 РЕКОРД ВЫЖИВАНИЯ: %.1f сек" % GameManager.high_score
		else:
			highscore_label.text = "🏆 РЕКОРД ВЫЖИВАНИЯ: 0.0 сек"

	if girl_eyes:
		girl_eyes.pivot_offset = girl_eyes.size * 0.5
		girl_eyes.scale = Vector2.ONE

	_init_neon_signs()

	# Setup smooth hover scaling on all buttons
	_setup_button_hover(btn_play)
	_setup_button_hover(btn_map)
	_setup_button_hover(btn_controls)
	_setup_button_hover(btn_quit)
	_setup_button_hover(btn_preset)
	_setup_button_hover(btn_close_controls)

	if btn_play:
		btn_play.pressed.connect(_on_play_pressed)
	if btn_map:
		btn_map.pressed.connect(_on_map_pressed)
	if btn_preset:
		btn_preset.pressed.connect(_on_preset_pressed)
	if btn_controls:
		btn_controls.pressed.connect(_on_controls_pressed)
	if btn_quit:
		btn_quit.pressed.connect(_on_quit_pressed)
	if btn_close_controls:
		btn_close_controls.pressed.connect(_on_close_controls_pressed)

	if speed_slider:
		speed_slider.value = GameManager.nextbot_base_speed
		speed_slider.value_changed.connect(_on_speed_changed)
		update_speed_label(GameManager.nextbot_base_speed)

	update_map_button()
	update_preset_button()

func _init_neon_signs() -> void:
	signs.clear()

	# 0: Danger Top-Left (Cyan) - sturdy, slow industrial breathing
	var s0 = NeonSign.new()
	s0.name = "danger_top_left"
	s0.pulse_speed = 1.6
	s0.pulse_amp = 0.14
	s0.pulse_phase = 0.0
	s0.next_event_timer = randf_range(16.0, 26.0)
	s0.can_burn_out = false
	signs.append(s0)

	# 1: Kanji Left (Purple "危険の禁悪") - faulty ballast, violent flickers, burns out to black glass
	var s1 = NeonSign.new()
	s1.name = "kanji_left"
	s1.pulse_speed = 3.2
	s1.pulse_amp = 0.18
	s1.pulse_phase = 1.2
	s1.next_event_timer = randf_range(4.5, 8.5)
	s1.can_burn_out = true
	s1.spark_node = kanji_sparks
	signs.append(s1)

	# 2: Danger Mid-Left (Cyan) - mid corridor sign
	var s2 = NeonSign.new()
	s2.name = "danger_mid_left"
	s2.pulse_speed = 2.7
	s2.pulse_amp = 0.16
	s2.pulse_phase = 2.4
	s2.next_event_timer = randf_range(8.0, 16.0)
	s2.can_burn_out = false
	signs.append(s2)

	# 3: Exit Mid Red - hanging red exit sign, sinister pulse, occasional blackout
	var s3 = NeonSign.new()
	s3.name = "exit_mid_red"
	s3.pulse_speed = 2.2
	s3.pulse_amp = 0.22
	s3.pulse_phase = 0.9
	s3.next_event_timer = randf_range(6.0, 11.0)
	s3.can_burn_out = true
	s3.spark_node = exit_sparks
	signs.append(s3)

	# 4: Kanji Top-Right (Cyan/Pink) - smooth cyber pulse
	var s4 = NeonSign.new()
	s4.name = "kanji_top_right"
	s4.pulse_speed = 2.0
	s4.pulse_amp = 0.15
	s4.pulse_phase = 3.5
	s4.next_event_timer = randf_range(12.0, 22.0)
	s4.can_burn_out = false
	signs.append(s4)

	# 5: Exit Top-Right (Red) - steady ceiling sign
	var s5 = NeonSign.new()
	s5.name = "exit_top_right"
	s5.pulse_speed = 1.8
	s5.pulse_amp = 0.12
	s5.pulse_phase = 4.1
	s5.next_event_timer = randf_range(10.0, 20.0)
	s5.can_burn_out = false
	signs.append(s5)

	# 6: Warning Far & Mid-Right Pink
	var s6 = NeonSign.new()
	s6.name = "warning_far"
	s6.pulse_speed = 3.5
	s6.pulse_amp = 0.20
	s6.pulse_phase = 1.7
	s6.next_event_timer = randf_range(7.0, 14.0)
	s6.can_burn_out = false
	signs.append(s6)

	# 7: Panel LEDs - rhythmic blinking breaker/relay lights
	var s7 = NeonSign.new()
	s7.name = "panel_leds"
	s7.pulse_speed = 4.0
	s7.pulse_amp = 0.5
	s7.pulse_phase = 0.0
	s7.next_event_timer = 999.0
	s7.can_burn_out = false
	signs.append(s7)

func _input(event: InputEvent) -> void:
	if event is InputEventMouseMotion:
		var vp_size = get_viewport_rect().size
		if vp_size.x > 0.0 and vp_size.y > 0.0:
			var center = vp_size * 0.5
			var norm = (event.position - center) / center
			target_parallax = Vector2(clampf(norm.x, -1.0, 1.0), clampf(norm.y, -1.0, 1.0))

func _setup_button_hover(btn: Button) -> void:
	if not btn: return
	btn.pivot_offset = btn.size / 2.0
	btn.resized.connect(func(): if is_instance_valid(btn): btn.pivot_offset = btn.size / 2.0)
	btn.mouse_entered.connect(func(): _animate_button_scale(btn, 1.05))
	btn.mouse_exited.connect(func(): _animate_button_scale(btn, 1.0))
	btn.focus_entered.connect(func(): _animate_button_scale(btn, 1.05))
	btn.focus_exited.connect(func(): _animate_button_scale(btn, 1.0))

func _animate_button_scale(btn: Button, target_scale: float) -> void:
	if not is_instance_valid(btn): return
	var tween = create_tween().set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	tween.tween_property(btn, "scale", Vector2(target_scale, target_scale), 0.14)

func _process(delta: float) -> void:
	eye_time += delta

	# Smooth mouse parallax on background & corridor atmosphere
	mouse_parallax = mouse_parallax.lerp(target_parallax, delta * 3.5)
	if parallax_container:
		parallax_container.position = base_parallax_pos + mouse_parallax * Vector2(-12.0, -8.0)

	# Process physical neon signs simulation
	_process_neon_signs(delta)

	# Menacing breathing and blinking red eye flares on nextbot silhouette
	if girl_eyes:
		# Smooth sinister breathing pulsation
		var pulse = 0.85 + sin(eye_time * 2.6) * 0.35 + sin(eye_time * 5.8) * 0.15

		# Lifelike periodic blinking
		if not is_blinking:
			next_blink_time -= delta
			if next_blink_time <= 0.0:
				is_blinking = true
				blink_timer = 0.12
				next_blink_time = randf_range(2.8, 6.0)
		else:
			blink_timer -= delta
			pulse = 0.0 # Eyes completely shut when blinking
			if blink_timer <= 0.0:
				is_blinking = false
				pulse = 1.6 # Intense flare on reopening!

		# Modulate alpha & glow only - never touch scale or position so eyes stay perfectly aligned
		var a = clampf(pulse, 0.0, 1.8)
		girl_eyes.modulate = Color(1.0 + clampf(pulse - 1.0, 0.0, 0.6), 0.9, 0.9, a)
		girl_eyes.scale = Vector2.ONE

	# Dynamic periodic cyber glitch burst on logo
	if logo_rect and logo_rect.material is ShaderMaterial:
		var mat = logo_rect.material as ShaderMaterial
		if not glitch_active:
			glitch_timer -= delta
			if glitch_timer <= 0.0:
				glitch_active = true
				glitch_duration = randf_range(0.18, 0.30)
				glitch_timer = randf_range(2.8, 5.0)
		else:
			glitch_duration -= delta
			var intensity = randf_range(0.45, 0.95)
			mat.set_shader_parameter("glitch_intensity", intensity)
			if glitch_duration <= 0.0:
				glitch_active = false
				mat.set_shader_parameter("glitch_intensity", 0.0)

func _process_neon_signs(delta: float) -> void:
	for sign in signs:
		match sign.state:
			NeonSign.State.NORMAL:
				sign.next_event_timer -= delta
				var wave = sin(eye_time * sign.pulse_speed + sign.pulse_phase) * sign.pulse_amp
				var micro_jitter = (randf() - 0.5) * 0.02
				sign.intensity = sign.base_intensity + wave + micro_jitter
				if sign.name == "panel_leds":
					sign.intensity = 1.5 if fmod(eye_time * 1.5 + sign.pulse_phase, 1.0) < 0.65 else 0.05

				if sign.next_event_timer <= 0.0:
					sign.state = NeonSign.State.FLICKER
					sign.state_timer = randf_range(0.35, 0.75)
					sign.flicker_subtimer = 0.0
					if randf() < 0.75:
						SoundManager.play_sfx("neon_flicker", -16.0)
					if sign.spark_node and randf() < 0.6:
						sign.spark_node.restart()
						sign.spark_node.emitting = true

			NeonSign.State.FLICKER:
				sign.state_timer -= delta
				sign.flicker_subtimer -= delta
				if sign.flicker_subtimer <= 0.0:
					sign.flicker_subtimer = randf_range(0.025, 0.07)
					if randf() < 0.38:
						sign.intensity = randf_range(0.05, 0.25)
					elif randf() < 0.68:
						sign.intensity = randf_range(0.6, 1.1)
					else:
						sign.intensity = randf_range(1.3, 1.85)

				if sign.state_timer <= 0.0:
					if sign.can_burn_out and randf() < 0.52:
						# Total burnout! Sign turns off completely into dark tubes & cold metal
						sign.state = NeonSign.State.BURNOUT
						sign.state_timer = randf_range(1.8, 3.8)
						sign.intensity = 0.0
						SoundManager.play_sfx("neon_spark", -18.0)
						if sign.spark_node:
							sign.spark_node.restart()
							sign.spark_node.emitting = true
					else:
						# Stabilize with small flash
						sign.state = NeonSign.State.NORMAL
						sign.intensity = 1.35
						sign.next_event_timer = randf_range(7.0, 15.0)

			NeonSign.State.BURNOUT:
				sign.intensity = 0.0
				sign.state_timer -= delta
				if sign.state_timer <= 0.0:
					# Attempt electrical restart sequence
					sign.state = NeonSign.State.RESTART
					sign.restart_step = 0
					sign.state_timer = 0.08
					sign.intensity = 1.3
					SoundManager.play_sfx("neon_restart", -14.0)

			NeonSign.State.RESTART:
				sign.state_timer -= delta
				if sign.state_timer <= 0.0:
					sign.restart_step += 1
					match sign.restart_step:
						1:
							sign.intensity = 0.05
							sign.state_timer = 0.10
						2:
							sign.intensity = 1.6
							sign.state_timer = 0.07
						3:
							sign.intensity = 0.4
							sign.state_timer = 0.06
						4:
							sign.intensity = 2.15 # Powerful ignition burst!
							sign.state_timer = 0.45
							if sign.spark_node:
								sign.spark_node.restart()
								sign.spark_node.emitting = true
						5:
							sign.state = NeonSign.State.NORMAL
							sign.intensity = 1.0
							sign.next_event_timer = randf_range(8.0, 18.0)

	# Update Neon Background Shader
	if background_rect and background_rect.material is ShaderMaterial:
		var neon_mat = background_rect.material as ShaderMaterial
		var v1 = Vector4(signs[0].intensity, signs[1].intensity, signs[2].intensity, signs[3].intensity)
		var v2 = Vector4(signs[4].intensity, signs[5].intensity, signs[6].intensity, signs[7].intensity)
		neon_mat.set_shader_parameter("sign_intensities_1", v1)
		neon_mat.set_shader_parameter("sign_intensities_2", v2)

	# Update Corridor Smoke Shader lighting responsiveness
	if corridor_smoke and corridor_smoke.material is ShaderMaterial:
		var smoke_mat = corridor_smoke.material as ShaderMaterial
		smoke_mat.set_shader_parameter("purple_light", signs[1].intensity)
		var cyan_avg = (signs[0].intensity + signs[4].intensity) * 0.5
		smoke_mat.set_shader_parameter("cyan_light", cyan_avg)
		smoke_mat.set_shader_parameter("red_light", signs[3].intensity)

func update_map_button() -> void:
	if not btn_map: return
	if selected_map == GameManager.MapType.MAZE:
		btn_map.text = "КАРТА: КЛАССИЧЕСКИЙ ЛАБИРИНТ"
	else:
		btn_map.text = "КАРТА: МЕСЯЧНЫЙ ВУЛКАН"

func update_preset_button() -> void:
	if not btn_preset: return
	if GameManager.current_preset == GameManager.AssetPreset.STANDARD:
		btn_preset.text = "🎨 ПРЕСЕТ: СТАНДАРТНЫЙ (ФОТО)"
	else:
		btn_preset.text = "🎨 ПРЕСЕТ: АВТОРСКИЙ (ВИДЕО)"

func update_speed_label(val: float) -> void:
	if speed_label:
		speed_label.text = "⚡ СКОРОСТЬ ДЕВУШКИ: %.1f м/с" % val

func _on_speed_changed(val: float) -> void:
	GameManager.set_nextbot_speed(val)
	update_speed_label(val)

func _on_preset_pressed() -> void:
	SoundManager.play_sfx("flashlight")
	if GameManager.current_preset == GameManager.AssetPreset.STANDARD:
		GameManager.set_preset(GameManager.AssetPreset.AUTHOR)
	else:
		GameManager.set_preset(GameManager.AssetPreset.STANDARD)
	update_preset_button()

func _on_play_pressed() -> void:
	SoundManager.play_sfx("pickup")
	SoundManager.stop_menu_ambience()
	GameManager.start_game(selected_map)

func _on_map_pressed() -> void:
	SoundManager.play_sfx("flashlight")
	if selected_map == GameManager.MapType.MAZE:
		selected_map = GameManager.MapType.CRATER
	else:
		selected_map = GameManager.MapType.MAZE
	update_map_button()

func _on_controls_pressed() -> void:
	SoundManager.play_sfx("flashlight")
	if controls_popup:
		controls_popup.visible = true

func _on_close_controls_pressed() -> void:
	SoundManager.play_sfx("flashlight")
	if controls_popup:
		controls_popup.visible = false

func _on_quit_pressed() -> void:
	get_tree().quit()
