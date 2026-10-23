extends Control

@onready var title_label: Label = $VBoxContainer/Title
@onready var subtitle_label: Label = $VBoxContainer/Subtitle
@onready var btn_retry: Button = $Buttons/BtnRetry
@onready var btn_menu: Button = $Buttons/BtnMenu
@onready var video_player: VideoStreamPlayer = $VideoStreamPlayer
@onready var image_jumpscare: TextureRect = $ImageJumpscare

func _ready() -> void:
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE

	btn_retry.pressed.connect(_on_retry_pressed)
	btn_menu.pressed.connect(_on_menu_pressed)

	# Play browser defeat sound
	SoundManager.play_sfx("game_over")

	# Apply preset: Video for Author (if available), Photo for Standard
	var stream = GameManager.get_game_over_video_stream()
	if stream and video_player:
		video_player.stream = stream
		video_player.visible = true
		video_player.loop = true
		video_player.play()
		if image_jumpscare:
			image_jumpscare.visible = false
	else:
		if video_player:
			video_player.stop()
			video_player.visible = false
		if image_jumpscare:
			image_jumpscare.texture = GameManager.get_game_over_texture()
			image_jumpscare.visible = true

func _on_retry_pressed() -> void:
	SoundManager.play_sfx("pickup")
	GameManager.start_game(GameManager.current_map)

func _on_menu_pressed() -> void:
	SoundManager.play_sfx("flashlight")
	get_tree().change_scene_to_file("res://scenes/main_menu.tscn")
