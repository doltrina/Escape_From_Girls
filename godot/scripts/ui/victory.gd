extends Control

@onready var title_label: Label = $VBoxContainer/Title
@onready var subtitle_label: Label = $VBoxContainer/Subtitle
@onready var desc_label: Label = $VBoxContainer/Description
@onready var stats_label: Label = $VBoxContainer/Stats
@onready var btn_play_again: Button = $Buttons/BtnPlayAgain
@onready var btn_menu: Button = $Buttons/BtnMenu
@onready var video_player: VideoStreamPlayer = $VideoStreamPlayer

func _ready() -> void:
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE

	btn_play_again.pressed.connect(_on_play_again_pressed)
	btn_menu.pressed.connect(_on_menu_pressed)

	if video_player:
		var stream = GameManager.get_victory_video_stream()
		if stream:
			video_player.stream = stream
			video_player.visible = true
			video_player.play()
		else:
			video_player.visible = false

	var total_sec = GameManager.elapsed_time
	var mins = int(total_sec / 60.0)
	var secs = int(fmod(total_sec, 60.0))
	var tenths = int(fmod(total_sec * 10.0, 10.0))
	stats_label.text = "⏱️ ВРЕМЯ ПОБЕГА: %02d:%02d.%d\n🏆 ЛУЧШИЙ РЕКОРД: %.1f сек" % [mins, secs, tenths, GameManager.high_score]

func _on_play_again_pressed() -> void:
	SoundManager.play_sfx("pickup")
	GameManager.start_game(GameManager.current_map)

func _on_menu_pressed() -> void:
	SoundManager.play_sfx("flashlight")
	get_tree().change_scene_to_file("res://scenes/main_menu.tscn")
