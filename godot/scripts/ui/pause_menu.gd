extends Control

@onready var btn_resume: Button = $Panel/VBoxContainer/BtnResume
@onready var btn_restart: Button = $Panel/VBoxContainer/BtnRestart
@onready var btn_preset: Button = $Panel/VBoxContainer/BtnPreset
@onready var speed_slider: HSlider = $Panel/VBoxContainer/SpeedBox/SpeedSlider
@onready var speed_label: Label = $Panel/VBoxContainer/SpeedBox/SpeedLabel
@onready var btn_menu: Button = $Panel/VBoxContainer/BtnMenu

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	visible = false

	btn_resume.pressed.connect(_on_resume_pressed)
	btn_restart.pressed.connect(_on_restart_pressed)
	btn_preset.pressed.connect(_on_preset_pressed)
	btn_menu.pressed.connect(_on_menu_pressed)

	if speed_slider:
		speed_slider.value = GameManager.nextbot_base_speed
		speed_slider.value_changed.connect(_on_speed_changed)
		update_speed_label(GameManager.nextbot_base_speed)

	update_preset_button()

func update_preset_button() -> void:
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

func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("pause"):
		if GameManager.current_state == GameManager.GameState.PLAYING:
			toggle_pause()
		elif GameManager.current_state == GameManager.GameState.PAUSED:
			toggle_pause()

func toggle_pause() -> void:
	var is_paused = not get_tree().paused
	get_tree().paused = is_paused
	visible = is_paused
	mouse_filter = Control.MOUSE_FILTER_STOP if is_paused else Control.MOUSE_FILTER_IGNORE
	if is_paused:
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
		GameManager.change_state(GameManager.GameState.PAUSED)
		update_preset_button()
		if speed_slider:
			speed_slider.value = GameManager.nextbot_base_speed
			update_speed_label(GameManager.nextbot_base_speed)
	else:
		Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
		GameManager.change_state(GameManager.GameState.PLAYING)

func _on_resume_pressed() -> void:
	SoundManager.play_sfx("flashlight")
	toggle_pause()

func _on_restart_pressed() -> void:
	SoundManager.play_sfx("pickup")
	get_tree().paused = false
	visible = false
	GameManager.start_game(GameManager.current_map)

func _on_menu_pressed() -> void:
	SoundManager.play_sfx("flashlight")
	get_tree().paused = false
	visible = false
	get_tree().change_scene_to_file("res://scenes/main_menu.tscn")

