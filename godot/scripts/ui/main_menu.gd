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

var selected_map: GameManager.MapType = GameManager.MapType.MAZE

func _ready() -> void:
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	GameManager.change_state(GameManager.GameState.MENU)

	# Ensure generated menu background texture is loaded
	if background_rect:
		var tex = load("res://assets/textures/menu_bg.png")
		if not tex:
			var global_path = ProjectSettings.globalize_path("res://assets/textures/menu_bg.png")
			if FileAccess.file_exists(global_path):
				var img = Image.new()
				if img.load(global_path) == OK:
					tex = ImageTexture.create_from_image(img)
		if tex:
			background_rect.texture = tex

	if highscore_label:
		if GameManager.high_score > 0.0:
			highscore_label.text = "🏆 РЕКОРД ВЫЖИВАНИЯ: %.1f сек" % GameManager.high_score
		else:
			highscore_label.text = "🏆 РЕКОРД ВЫЖИВАНИЯ: 0.0 сек"

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

func update_map_button() -> void:
	if not btn_map: return
	if selected_map == GameManager.MapType.MAZE:
		btn_map.text = "🗺️ КАРТА: КЛАССИЧЕСКИЙ ЛАБИРИНТ"
	else:
		btn_map.text = "🌋 КАРТА: МЕСЯЧНЫЙ ВУЛКАН"

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
