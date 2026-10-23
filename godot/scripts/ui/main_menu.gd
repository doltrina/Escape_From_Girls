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
@onready var background_rect: TextureRect = find_child("Background", true, false)
@onready var girl_eyes: TextureRect = find_child("GirlEyesFlare", true, false)
@onready var logo_rect: TextureRect = find_child("Logo", true, false)

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

func _ready() -> void:
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	GameManager.change_state(GameManager.GameState.MENU)

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
	# Menacing breathing and blinking red eye flares on nextbot silhouette
	if girl_eyes:
		eye_time += delta
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
