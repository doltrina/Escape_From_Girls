extends Node

enum GameState {
	MENU,
	PLAYING,
	PAUSED,
	GAMEOVER,
	VICTORY,
	CUTSCENE
}

enum MapType {
	MAZE,
	CRATER
}

signal state_changed(new_state: GameState)
signal keys_updated(count: int, total: int)
signal inventory_updated(item_id: String, count: int)
signal relics_updated(relic_id: String, total_found: int)
signal stamina_updated(current: float, max_val: float)
signal shield_status_updated(active: bool, time_left: float)
signal speed_boost_updated(active: bool, time_left: float)
signal game_over_triggered(title: String, subtitle: String)
signal victory_triggered(title: String, description: String)

enum AssetPreset {
	STANDARD, # Photo of real girl & photo for gameover
	AUTHOR    # Drawn anime illustration of girl & drawn picture for gameover
}

signal preset_changed(new_preset: AssetPreset)
signal nextbot_speed_changed(new_speed: float)

var current_state: GameState = GameState.MENU
var current_map: MapType = MapType.MAZE
var current_preset: AssetPreset = AssetPreset.STANDARD
var nextbot_base_speed: float = 7.8

var elapsed_time: float = 0.0
var high_score: float = 0.0

# Maze Objectives
var keys_collected: int = 0
var total_keys: int = 3
var is_door_open: bool = false

# Volcano Objectives
var relics_collected: Dictionary = {
	"blade": false,
	"seal": false,
	"amulet": false,
	"chalice": false
}
var torii_gates_open: bool = false

# Inventory & Shields
var inventory: Dictionary = {
	"forcefield": 0,
	"energy_drink": 0,
	"dakimakura": 0,
	"d20_dice": 0
}

# Active Buffs
var shield_active: bool = false
var shield_timer: float = 0.0
var speed_boost_active: bool = false
var speed_boost_timer: float = 0.0
var extra_lives: int = 0

# References
var player_node: Node3D = null
var nextbot_node: Node3D = null
var helicopter_node: Node3D = null
var city_girl_node: Node3D = null
var city_origin: Vector3 = Vector3(150.0, 40.0, 150.0)
var crater_platforms: Array[Vector3] = []

func set_nextbot_speed(speed: float) -> void:
	nextbot_base_speed = clampf(speed, 4.0, 13.0)
	if nextbot_node and is_instance_valid(nextbot_node):
		nextbot_node.base_speed = nextbot_base_speed
		nextbot_node.current_speed = nextbot_base_speed
	nextbot_speed_changed.emit(nextbot_base_speed)

func _input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_F11 or (event.alt_pressed and event.keycode == KEY_ENTER):
			toggle_fullscreen()

func toggle_fullscreen() -> void:
	var mode = DisplayServer.window_get_mode()
	if mode == DisplayServer.WINDOW_MODE_FULLSCREEN or mode == DisplayServer.WINDOW_MODE_EXCLUSIVE_FULLSCREEN:
		DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_MAXIMIZED)
	else:
		DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_FULLSCREEN)

func set_preset(preset: AssetPreset) -> void:
	current_preset = preset
	preset_changed.emit(current_preset)
	if nextbot_node and is_instance_valid(nextbot_node) and nextbot_node.has_method("apply_preset_texture"):
		nextbot_node.apply_preset_texture()

func get_girl_texture() -> Texture2D:
	if current_preset == AssetPreset.AUTHOR:
		var author_tex = load_texture_safe("res://assets/presets/author/girl.png")
		if author_tex:
			return author_tex
	# Standard preset (or fallback if author asset is missing)
	var std_tex = load_texture_safe("res://assets/presets/standard/girl.png")
	if std_tex:
		return std_tex
	return load_texture_safe("res://assets/textures/girl_default.png")

func get_game_over_texture() -> Texture2D:
	if current_preset == AssetPreset.AUTHOR:
		var author_tex = load_texture_safe("res://assets/presets/author/game_over.png")
		if author_tex:
			return author_tex
	var std_tex = load_texture_safe("res://assets/presets/standard/game_over.png")
	if std_tex:
		return std_tex
	return load_texture_safe("res://assets/textures/romantic_scene.png")

func get_game_over_video_stream() -> VideoStream:
	if current_preset == AssetPreset.AUTHOR:
		var ogv_path = "res://assets/presets/author/game_over.ogv"
		if ResourceLoader.exists(ogv_path):
			var v = load(ogv_path)
			if v is VideoStream:
				return v
	return null

func get_victory_video_stream() -> VideoStream:
	if current_preset == AssetPreset.AUTHOR:
		var ogv_path = "res://assets/presets/author/victory.ogv"
		if ResourceLoader.exists(ogv_path):
			var v = load(ogv_path)
			if v is VideoStream:
				return v
	return null

func load_texture_safe(res_path: String) -> Texture2D:
	if ResourceLoader.exists(res_path):
		var res = load(res_path)
		if res is Texture2D:
			return res
	# Fallback to direct image load
	var global = ProjectSettings.globalize_path(res_path)
	if FileAccess.file_exists(global):
		var img = Image.new()
		if img.load(global) == OK:
			return ImageTexture.create_from_image(img)
	return null

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	load_high_score()

func _process(delta: float) -> void:
	if current_state == GameState.PLAYING:
		elapsed_time += delta

		if shield_active:
			shield_timer -= delta
			shield_status_updated.emit(true, shield_timer)
			if shield_timer <= 0.0:
				shield_active = false
				shield_status_updated.emit(false, 0.0)

		if speed_boost_active:
			speed_boost_timer -= delta
			speed_boost_updated.emit(true, speed_boost_timer)
			if speed_boost_timer <= 0.0:
				speed_boost_active = false
				speed_boost_updated.emit(false, 0.0)

func change_state(new_state: GameState) -> void:
	current_state = new_state
	state_changed.emit(new_state)

func start_game(map_type: MapType = MapType.MAZE) -> void:
	current_map = map_type
	elapsed_time = 0.0
	keys_collected = 0
	is_door_open = false
	torii_gates_open = false
	shield_active = false
	shield_timer = 0.0
	speed_boost_active = false
	speed_boost_timer = 0.0

	for k in relics_collected.keys():
		relics_collected[k] = false

	inventory = {
		"forcefield": 0,
		"energy_drink": 0,
		"dakimakura": 0,
		"d20_dice": 0
	}

	keys_updated.emit(keys_collected, total_keys)
	change_state(GameState.CUTSCENE)

	if map_type == MapType.MAZE:
		get_tree().change_scene_to_file("res://scenes/maps/maze_map.tscn")
	else:
		get_tree().change_scene_to_file("res://scenes/maps/volcano_crater_map.tscn")

func collect_key() -> void:
	keys_collected += 1
	keys_updated.emit(keys_collected, total_keys)
	SoundManager.play_sfx("key_pickup")
	if keys_collected >= total_keys:
		is_door_open = true

func collect_relic(relic_id: String) -> void:
	if relics_collected.has(relic_id) and not relics_collected[relic_id]:
		relics_collected[relic_id] = true
		var count: int = 0
		for r in relics_collected.values():
			if r: count += 1
		relics_updated.emit(relic_id, count)
		SoundManager.play_sfx("key_pickup")
		if count >= 4:
			torii_gates_open = true

func add_inventory_item(item_id: String, count: int = 1) -> void:
	if not inventory.has(item_id):
		inventory[item_id] = 0
	inventory[item_id] += count
	inventory_updated.emit(item_id, inventory[item_id])
	SoundManager.play_sfx("pickup")

func use_item(item_id: String) -> bool:
	if inventory.get(item_id, 0) <= 0:
		return false

	inventory[item_id] -= 1
	inventory_updated.emit(item_id, inventory[item_id])

	match item_id:
		"forcefield":
			shield_active = true
			shield_timer = 6.0
			SoundManager.play_sfx("shield_blast")
			if nextbot_node and is_instance_valid(nextbot_node) and nextbot_node.has_method("repel"):
				nextbot_node.repel(26.0)
			return true

		"energy_drink":
			speed_boost_active = true
			speed_boost_timer = 5.0
			SoundManager.play_sfx("drink")
			if player_node and is_instance_valid(player_node) and player_node.has_method("restore_stamina"):
				player_node.restore_stamina()
			return true

		"dakimakura":
			SoundManager.play_sfx("pickup")
			if player_node and is_instance_valid(player_node):
				spawn_dakimakura_decoy(player_node.global_position)
			return true

		"d20_dice":
			extra_lives += 1
			SoundManager.play_sfx("d20_save")
			return true

	return false

func spawn_dakimakura_decoy(pos: Vector3) -> void:
	var decoy_scene = load("res://scenes/decoy_dakimakura.tscn")
	if decoy_scene:
		var decoy = decoy_scene.instantiate()
		get_tree().current_scene.add_child(decoy)
		decoy.global_position = pos
		if nextbot_node and is_instance_valid(nextbot_node) and nextbot_node.has_method("distract"):
			nextbot_node.distract(pos, 5.0)

func trigger_game_over(title: String = "ТЫ ПОТЕРЯЛ ДЕВСТВЕННОСТЬ", subtitle: String = "Девушка Nextbot настигла тебя...") -> void:
	if current_state == GameState.GAMEOVER or current_state == GameState.VICTORY:
		return

	# D20 Second Chance check
	if inventory.get("d20_dice", 0) > 0 or extra_lives > 0:
		if extra_lives > 0:
			extra_lives -= 1
		else:
			inventory["d20_dice"] -= 1
			inventory_updated.emit("d20_dice", inventory["d20_dice"])
		SoundManager.play_sfx("d20_save")
		if nextbot_node and is_instance_valid(nextbot_node) and nextbot_node.has_method("repel"):
			nextbot_node.repel(20.0)
		return

	change_state(GameState.GAMEOVER)
	SoundManager.stop_chase_music()
	SoundManager.play_sfx("game_over")
	game_over_triggered.emit(title, subtitle)
	get_tree().call_deferred("change_scene_to_file", "res://scenes/screens/game_over.tscn")

func trigger_victory(title: String = "ТЫ СОХРАНИЛ ДЕВСТВЕННОСТЬ!", description: String = "Ты обхитрил девушку и совершил побег!") -> void:
	if current_state == GameState.GAMEOVER or current_state == GameState.VICTORY:
		return

	if elapsed_time > high_score:
		high_score = elapsed_time
		save_high_score()

	change_state(GameState.VICTORY)
	SoundManager.stop_chase_music()
	SoundManager.play_sfx("victory")
	victory_triggered.emit(title, description)
	get_tree().call_deferred("change_scene_to_file", "res://scenes/screens/victory.tscn")

func save_high_score() -> void:
	var file = FileAccess.open("user://virginity_record.save", FileAccess.WRITE)
	if file:
		file.store_float(high_score)

func load_high_score() -> void:
	if FileAccess.file_exists("user://virginity_record.save"):
		var file = FileAccess.open("user://virginity_record.save", FileAccess.READ)
		if file:
			high_score = file.get_float()
