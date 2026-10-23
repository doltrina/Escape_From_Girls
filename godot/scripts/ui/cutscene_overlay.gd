extends Control

signal cutscene_completed

@onready var letterbox_top: ColorRect = $LetterboxTop
@onready var letterbox_bottom: ColorRect = $LetterboxBottom
@onready var fx_layer: ColorRect = $FXLayer

# Subtitles
@onready var subtitle_panel: PanelContainer = $SubtitlePanel
@onready var speaker_label: Label = $SubtitlePanel/Margin/VBox/SpeakerLabel
@onready var dialogue_label: Label = $SubtitlePanel/Margin/VBox/DialogueLabel
@onready var prompt_label: Label = $SubtitlePanel/Margin/VBox/PromptLabel

# Interactive Center Elements
@onready var phone_container: Control = $CenterStage/PhoneContainer
@onready var phone_reply_label: Label = $CenterStage/PhoneContainer/PhoneBody/Screen/InputBar/ReplyText
@onready var cracks_overlay: Control = $CenterStage/PhoneContainer/PhoneBody/Screen/CracksOverlay
@onready var city_container: Control = $CenterStage/CityContainer
@onready var city_girl: TextureRect = $CenterStage/CityContainer/CityGirl
@onready var heli_call_container: Control = $CenterStage/HeliCallContainer
@onready var ambush_container: Control = $CenterStage/AmbushContainer
@onready var ambush_texture: TextureRect = $CenterStage/AmbushContainer/GirlSprite
@onready var shatter_overlay: ColorRect = $CenterStage/ShatterOverlay

# Skip UI
@onready var skip_container: Control = $SkipContainer
@onready var skip_progress_bar: ProgressBar = $SkipContainer/ProgressBar
@onready var btn_skip: Button = $SkipContainer/BtnSkip

var is_active: bool = false
var current_level: GameManager.MapType = GameManager.MapType.MAZE
var steps: Array = []
var step_index: int = -1
var is_waiting_input: bool = false
var auto_advance_timer: float = 0.0

# Hold-to-skip
var skip_hold_time: float = 0.0
const SKIP_HOLD_REQUIRED: float = 0.75

var original_phone_pos: Vector2 = Vector2.ZERO
var active_camera_tween: Tween = null
var active_scene_tween: Tween = null

func stop_camera_tweens() -> void:
	if active_camera_tween and is_instance_valid(active_camera_tween) and active_camera_tween.is_valid():
		active_camera_tween.kill()
	active_camera_tween = null
	if active_scene_tween and is_instance_valid(active_scene_tween) and active_scene_tween.is_valid():
		active_scene_tween.kill()
	active_scene_tween = null
	var player = GameManager.player_node
	if player and is_instance_valid(player):
		var head = player.get_node_or_null("Head")
		if head:
			head.rotation = Vector3.ZERO
		if "camera_pitch" in player:
			player.camera_pitch = 0.0

func _ready() -> void:
	visible = false
	if phone_container:
		original_phone_pos = phone_container.position
	if btn_skip:
		btn_skip.pressed.connect(skip_cutscene)
	reset_visuals()

func start_cutscene(level_type: GameManager.MapType) -> void:
	is_active = true
	visible = true
	current_level = level_type
	step_index = -1
	skip_hold_time = 0.0
	if skip_progress_bar:
		skip_progress_bar.value = 0.0
	GameManager.change_state(GameManager.GameState.CUTSCENE)
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE

	if phone_container and original_phone_pos == Vector2.ZERO:
		original_phone_pos = phone_container.position

	reset_visuals()

	if level_type == GameManager.MapType.MAZE:
		build_maze_steps()
	else:
		build_crater_steps()

	advance_step()

func reset_visuals() -> void:
	if phone_container:
		phone_container.visible = false
		phone_container.position = original_phone_pos
		phone_container.rotation_degrees = -5.0
	if cracks_overlay: cracks_overlay.visible = false
	if city_container: city_container.visible = false
	if heli_call_container: heli_call_container.visible = false
	if ambush_container: ambush_container.visible = false
	if shatter_overlay: shatter_overlay.visible = false
	if fx_layer:
		fx_layer.visible = false
		fx_layer.color = Color(0, 0, 0, 0)
	if phone_reply_label: phone_reply_label.text = ""

func _input(event: InputEvent) -> void:
	if not is_active:
		return

	# Instant full skip on ESCAPE
	if event is InputEventKey and event.pressed and not event.echo and event.keycode == KEY_ESCAPE:
		get_viewport().set_input_as_handled()
		skip_cutscene()
		return

	# Advance dialogue on Left Mouse Click anywhere (or skip if clicking the skip button)
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		if btn_skip and btn_skip.get_global_rect().has_point(event.global_position):
			get_viewport().set_input_as_handled()
			skip_cutscene()
			return
		get_viewport().set_input_as_handled()
		advance_step()
		return

	# Advance dialogue on Enter
	if event is InputEventKey and event.pressed and not event.echo and (event.keycode == KEY_ENTER or event.keycode == KEY_KP_ENTER):
		get_viewport().set_input_as_handled()
		advance_step()
		return

	# Space key release: if released quickly (< 0.35s), it was a tap to advance dialogue!
	# Holding space longer will trigger skip in _process() via the hold progress bar.
	if event is InputEventKey and not event.pressed and not event.echo and event.keycode == KEY_SPACE:
		if skip_hold_time < 0.35:
			skip_hold_time = 0.0
			if skip_progress_bar:
				skip_progress_bar.value = 0.0
			get_viewport().set_input_as_handled()
			advance_step()
			return

func _process(delta: float) -> void:
	if not is_active:
		return

	# Hold Space to Skip
	if Input.is_key_pressed(KEY_SPACE):
		skip_hold_time += delta
		if skip_progress_bar:
			skip_progress_bar.value = clampf(skip_hold_time / SKIP_HOLD_REQUIRED, 0.0, 1.0)
		if skip_hold_time >= SKIP_HOLD_REQUIRED:
			skip_cutscene()
			return
	else:
		skip_hold_time = maxf(0.0, skip_hold_time - delta * 3.5)
		if skip_progress_bar:
			skip_progress_bar.value = clampf(skip_hold_time / SKIP_HOLD_REQUIRED, 0.0, 1.0)

	# Auto-advance timers
	if auto_advance_timer > 0.0:
		auto_advance_timer -= delta
		if auto_advance_timer <= 0.0:
			advance_step()

	# Prompt blink
	if prompt_label and is_waiting_input:
		prompt_label.modulate.a = 0.5 + sin(Time.get_ticks_msec() * 0.007) * 0.45

# =========================================================================
# 🎬 LEVEL 1: MAZE CUTSCENE STEPS
# =========================================================================
func build_maze_steps() -> void:
	steps = [
		{
			"speaker": "ГГ (вид от первого лица)",
			"text": "Ох-х... Голова раскалывается... Где я вообще нахожусь?..",
			"auto": false,
			"duration": 3.4,
			"action": _step_maze_1
		},
		{
			"speaker": "Входящее SMS от Бро (Mactraher)",
			"text": "«Йоу, чувак! Как прошла свиданка с той девчулей? Ты просто не отвечаешь. Я переживаю, бро».",
			"auto": false,
			"duration": 3.0,
			"action": _step_maze_2
		},
		{
			"speaker": "ГГ",
			"text": "Надо срочно ответить... «Бро, кажется, меня похит...»",
			"auto": false,
			"duration": 2.6,
			"action": _step_maze_3
		},
		{
			"speaker": "Девушка Nextbot",
			"text": "Хи-хи-хи... С кем это ты там переписываешься в темноте?!",
			"auto": false,
			"duration": 2.2,
			"action": _step_maze_4
		},
		{
			"speaker": "Телефон разбит!",
			"text": "БДЫЩ-Щ! Экран смартфона трескается вдребезги от резкого удара!",
			"auto": false,
			"duration": 2.5,
			"action": _step_maze_crack
		},
		{
			"speaker": "ГГ",
			"text": "Чёрт! Мой телефон! Она здесь... Надо уносить ноги и защищать девственность!",
			"auto": false,
			"duration": 2.5,
			"action": _step_maze_5
		}
	]

func _step_maze_1() -> void:
	reset_visuals()
	stop_camera_tweens()
	fx_layer.visible = true
	fx_layer.color = Color(0, 0, 0, 1.0)

	var player = GameManager.player_node
	if player and is_instance_valid(player):
		var head = player.get_node_or_null("Head")
		if head:
			head.rotation = Vector3(deg_to_rad(-24.0), 0.0, 0.0)
			# 1. Сначала плавно поднимает голову и убирается затухание
			active_camera_tween = create_tween()
			active_camera_tween.parallel().tween_property(fx_layer, "color:a", 0.0, 1.8).set_ease(Tween.EASE_OUT)
			active_camera_tween.parallel().tween_property(head, "rotation:x", 0.0, 1.8).set_ease(Tween.EASE_OUT)
			# 2. ПОТОМ плавно покачивает головой из стороны в сторону - слева направо (по горизонтали YAW)
			active_camera_tween.tween_property(head, "rotation:y", deg_to_rad(28.0), 0.65).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
			active_camera_tween.tween_property(head, "rotation:y", deg_to_rad(-28.0), 0.85).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
			active_camera_tween.tween_property(head, "rotation:y", deg_to_rad(12.0), 0.5).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
			active_camera_tween.tween_property(head, "rotation:y", 0.0, 0.4).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)

func _step_maze_2() -> void:
	reset_visuals()
	phone_container.visible = true
	phone_container.position.y = original_phone_pos.y + 400.0 # start below screen
	var tween = create_tween()
	tween.tween_property(phone_container, "position:y", original_phone_pos.y, 0.45).set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_BACK)
	phone_reply_label.text = ""
	SoundManager.play_sfx("pickup")

func _step_maze_3() -> void:
	phone_container.visible = true
	phone_container.position = original_phone_pos
	type_reply("Бро, кажется, меня похит...")

func _step_maze_4() -> void:
	ambush_container.visible = true
	if ambush_texture:
		ambush_texture.texture = GameManager.get_girl_texture()
	fx_layer.visible = true
	fx_layer.color = Color(1.0, 0.05, 0.2, 0.45)
	var tween = create_tween()
	tween.tween_property(fx_layer, "color:a", 0.0, 0.6)
	shake_element(ambush_container, 20.0, 0.5)
	SoundManager.play_sfx("door_locked")

func _step_maze_crack() -> void:
	ambush_container.visible = false
	phone_container.visible = true
	phone_container.position = original_phone_pos
	phone_container.rotation_degrees = 12.0 # Impact tilt
	if cracks_overlay:
		if cracks_overlay.has_method("show_cracks"):
			cracks_overlay.show_cracks()
		else:
			cracks_overlay.visible = true
			cracks_overlay.queue_redraw()

	# Impact flash and violent shake
	fx_layer.visible = true
	fx_layer.color = Color(1.0, 1.0, 1.0, 0.85)
	var flashtween = create_tween()
	flashtween.tween_property(fx_layer, "color:a", 0.0, 0.25)

	shake_element(phone_container, 28.0, 0.5)
	SoundManager.play_sfx("glass_shatter")

func _step_maze_5() -> void:
	shatter_overlay.visible = true
	phone_container.visible = true
	if cracks_overlay:
		if cracks_overlay.has_method("show_cracks"):
			cracks_overlay.show_cracks()
		else:
			cracks_overlay.visible = true
			cracks_overlay.queue_redraw()
	# Violent snatch: yank cracked phone downward to the left offscreen
	var tween = create_tween().set_parallel(true)
	tween.tween_property(phone_container, "position", original_phone_pos + Vector2(-160, 520), 0.4).set_ease(Tween.EASE_IN)
	tween.tween_property(phone_container, "rotation_degrees", -45.0, 0.4)
	SoundManager.play_sfx("door_locked")

# =========================================================================
# 🎬 LEVEL 2: VOLCANO CRATER CUTSCENE STEPS
# =========================================================================
func build_crater_steps() -> void:
	steps = [
		{
			"speaker": "ГГ (на ночной улице)",
			"text": "Кажется, вон та красотка стоит на тротуаре... Хм, подойти или нет?.. Ладно, была не была, подойду познакомлюсь!",
			"auto": false,
			"duration": 3.4,
			"action": _step_crater_1
		},
		{
			"speaker": "ГГ",
			"text": "«Привет, красотка! Не хочешь прогуляться вместе или выпить кофе?..»",
			"auto": false,
			"duration": 2.8,
			"action": _step_crater_2
		},
		{
			"speaker": "Девушка Nextbot",
			"text": "«Познакомиться?! Хи-хи-хи! ИДИ СЮДА, СЛАДЕНЬКИЙ!»",
			"auto": false,
			"duration": 3.6,
			"action": _step_crater_3
		},
		{
			"speaker": "ГГ (на дне кратера вулкана)",
			"text": "А-А-А! Куда я провалился?! Это же жерло вулкана, а снизу кипит и поднимается магма!",
			"auto": false,
			"duration": 3.2,
			"action": _step_crater_4
		},
		{
			"speaker": "Бро Mactraher (с вертолёта в мегафон)",
			"text": "«Бро! Держись! Я физически не могу опуститься в это кипящее жерло! Прыгай вверх по базальтовым платформам, и я подберу тебя на вершине!»",
			"auto": false,
			"duration": 3.6,
			"action": _step_crater_5
		},
		{
			"speaker": "ЦЕЛЬ: СПАСЕНИЕ",
			"text": "Покори 28 платформ, не упади в магму и спаси девственность! Девушка появится через 5 секунд — БЕГИ!",
			"auto": false,
			"duration": 2.5,
			"action": _step_crater_6
		}
	]

func _step_crater_1() -> void:
	reset_visuals()
	stop_camera_tweens()
	if city_container:
		city_container.visible = false # Using true 3D city scene!

	var player = GameManager.player_node
	if player and is_instance_valid(player):
		# Ground level is Y = 0.3 on sidewalk, eyes at Y = 1.95m, generous clearance under 3.5m bus stop canopy
		player.global_position = GameManager.city_origin + Vector3(-1.8, 0.3, 5.5)
		player.rotation = Vector3.ZERO
		var head = player.get_node_or_null("Head")
		if head:
			head.rotation = Vector3.ZERO
		if "camera_pitch" in player:
			player.camera_pitch = 0.0

	SoundManager.play_sfx("flashlight")

func _step_crater_2() -> void:
	reset_visuals()
	stop_camera_tweens()

	var player = GameManager.player_node
	if player and is_instance_valid(player):
		# Player walks forward along -Z straight towards the girl under the streetlight at Y = 0.3
		var target_pos = GameManager.city_origin + Vector3(-1.8, 0.3, -2.5)
		var tween = create_tween()
		tween.tween_property(player, "global_position", target_pos, 1.4).set_ease(Tween.EASE_OUT)

	SoundManager.play_sfx("pickup")

func _step_crater_3() -> void:
	reset_visuals()
	stop_camera_tweens()

	var player = GameManager.player_node
	var girl = GameManager.city_girl_node
	SoundManager.play_sfx("door_locked")

	# Subtle suspense twitch while she speaks before jumping
	if girl and is_instance_valid(girl):
		var orig_x = girl.global_position.x
		var twitch_tween = create_tween()
		for i in range(10):
			twitch_tween.tween_property(girl, "global_position:x", orig_x + randf_range(-0.05, 0.05), 0.25)
		twitch_tween.tween_property(girl, "global_position:x", orig_x, 0.05)

	# 2.5 second pause before the girl lunges!
	active_scene_tween = create_tween()
	active_scene_tween.tween_interval(2.5)
	active_scene_tween.tween_callback(func():
		if girl and is_instance_valid(girl) and player and is_instance_valid(player):
			var jump_tween = create_tween()
			jump_tween.tween_property(girl, "global_position", player.global_position + Vector3(0.0, 0.2, 0.6), 0.32).set_ease(Tween.EASE_IN)
			jump_tween.parallel().tween_property(girl, "scale", Vector3(2.8, 2.8, 2.8), 0.32)
			SoundManager.play_sfx("door_locked")

		# Screen fades completely to deep black right after her jump!
		fx_layer.visible = true
		fx_layer.color = Color(0, 0, 0, 0.0)
		var fxtween = create_tween()
		fxtween.tween_interval(0.2)
		fxtween.tween_property(fx_layer, "color:a", 1.0, 0.22)
		fxtween.tween_callback(func():
			# Move player to volcano platform 0 in complete darkness
			if player and is_instance_valid(player) and GameManager.crater_platforms.size() > 0:
				player.global_position = GameManager.crater_platforms[0] + Vector3(0, 1.8, 0)
				player.rotation = Vector3.ZERO
		)
	)

func _step_crater_4() -> void:
	reset_visuals()
	stop_camera_tweens()
	var player = GameManager.player_node
	if player and is_instance_valid(player) and GameManager.crater_platforms.size() > 0:
		player.global_position = GameManager.crater_platforms[0] + Vector3(0, 1.8, 0)

	# Smoothly dissipate black fade as player wakes up in the volcano
	fx_layer.visible = true
	fx_layer.color = Color(0, 0, 0, 1.0)
	var tween = create_tween()
	tween.tween_property(fx_layer, "color:a", 0.0, 1.0).set_ease(Tween.EASE_OUT)
	SoundManager.play_sfx("magma_death")

	if player and is_instance_valid(player):
		var head = player.get_node_or_null("Head")
		if head:
			active_camera_tween = create_tween()
			active_camera_tween.tween_property(head, "rotation:x", deg_to_rad(-22.0), 0.8).set_ease(Tween.EASE_OUT)

func _step_crater_5() -> void:
	reset_visuals()
	stop_camera_tweens()
	if heli_call_container:
		heli_call_container.visible = true
	SoundManager.play_sfx("victory")

	var player = GameManager.player_node
	var heli = GameManager.helicopter_node
	if player and is_instance_valid(player):
		var p_pos = player.global_position
		if heli and is_instance_valid(heli):
			heli.global_position = p_pos + Vector3(0.0, 7.5, -9.0)
			# Turned sideways so side door and Mactraher with megaphone are facing the player!
			heli.rotation = Vector3(0, deg_to_rad(-85.0), 0)

		var head = player.get_node_or_null("Head")
		if head:
			active_camera_tween = create_tween()
			active_camera_tween.tween_property(head, "rotation:x", deg_to_rad(36.0), 0.8).set_ease(Tween.EASE_OUT)

func _step_crater_6() -> void:
	reset_visuals()
	stop_camera_tweens()

	var heli = GameManager.helicopter_node
	if heli and is_instance_valid(heli) and GameManager.crater_platforms.size() > 27:
		var target_pos = GameManager.crater_platforms[27] + Vector3(0.0, 1.9, -1.0)
		var tween = create_tween()
		tween.tween_property(heli, "global_position", target_pos, 2.2).set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_QUAD)
		tween.parallel().tween_property(heli, "rotation:y", deg_to_rad(-85.0), 2.2)

func advance_step() -> void:
	stop_camera_tweens()
	step_index += 1
	if step_index >= steps.size():
		finish_cutscene()
		return

	var current_step = steps[step_index]
	speaker_label.text = current_step["speaker"]
	dialogue_label.text = current_step["text"]

	if current_step.get("auto", false):
		is_waiting_input = false
		prompt_label.visible = false
		auto_advance_timer = current_step.get("duration", 2.5)
	else:
		is_waiting_input = true
		prompt_label.visible = true
		auto_advance_timer = 0.0 # No auto-advance: player advances manually at their own pace

	if current_step.has("action"):
		current_step["action"].call()

func type_reply(text_to_type: String) -> void:
	var tween = create_tween()
	for i in range(1, text_to_type.length() + 1):
		var partial = text_to_type.substr(0, i)
		tween.tween_callback(func():
			if phone_reply_label:
				phone_reply_label.text = partial + "|"
		).set_delay(0.06)

func shake_element(node: Control, intensity: float, duration: float) -> void:
	var original_pos = node.position
	var tween = create_tween()
	var steps_count = 8
	var step_time = duration / float(steps_count)

	for i in range(steps_count):
		var offset = Vector2(randf_range(-intensity, intensity), randf_range(-intensity, intensity))
		tween.tween_property(node, "position", original_pos + offset, step_time)

	tween.tween_property(node, "position", original_pos, step_time)

func skip_cutscene() -> void:
	finish_cutscene()

func finish_cutscene() -> void:
	is_active = false
	visible = false
	reset_visuals()
	stop_camera_tweens()

	var player = GameManager.player_node
	if player and is_instance_valid(player):
		var head = player.get_node_or_null("Head")
		if head:
			head.rotation = Vector3.ZERO
		if "camera_pitch" in player:
			player.camera_pitch = 0.0

	# In Crater level, place player safely on Platform 0 and helicopter on Platform 27
	if current_level == GameManager.MapType.CRATER:
		if player and is_instance_valid(player) and GameManager.crater_platforms.size() > 0:
			player.global_position = GameManager.crater_platforms[0] + Vector3(0, 1.8, 0)
			player.velocity = Vector3.ZERO
		var heli = GameManager.helicopter_node
		if heli and is_instance_valid(heli) and GameManager.crater_platforms.size() > 27:
			heli.global_position = GameManager.crater_platforms[27] + Vector3(0.0, 1.9, -1.0)
			heli.rotation.y = deg_to_rad(-85.0)

	# In Maze level, ensure Nextbot is safely at the far top-left corner of the maze (>55m away)
	if current_level == GameManager.MapType.MAZE:
		var bot = GameManager.nextbot_node
		if bot and is_instance_valid(bot):
			bot.global_position = Vector3(-32.0, 0.5, -36.0)

	GameManager.change_state(GameManager.GameState.PLAYING)
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
	cutscene_completed.emit()
