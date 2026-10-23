extends Node3D

@onready var door_leaf: Node3D = $DoorLeaf
@onready var led1: MeshInstance3D = $Locks/LED1
@onready var led2: MeshInstance3D = $Locks/LED2
@onready var led3: MeshInstance3D = $Locks/LED3
@onready var trigger_zone: Area3D = $TriggerZone
@onready var exit_zone: Area3D = $ExitZone

var is_opening: bool = false
var open_progress: float = 0.0
var last_locked_sound_time: float = -99.0

var red_mat: StandardMaterial3D
var green_mat: StandardMaterial3D

func _ready() -> void:
	# Materials for lock LEDs
	red_mat = StandardMaterial3D.new()
	red_mat.albedo_color = Color(1.0, 0.1, 0.1)
	red_mat.emission_enabled = true
	red_mat.emission = Color(1.0, 0.0, 0.0)
	red_mat.emission_energy_multiplier = 2.0

	green_mat = StandardMaterial3D.new()
	green_mat.albedo_color = Color(0.1, 1.0, 0.3)
	green_mat.emission_enabled = true
	green_mat.emission = Color(0.0, 1.0, 0.2)
	green_mat.emission_energy_multiplier = 2.5

	update_leds(GameManager.keys_collected)
	GameManager.keys_updated.connect(_on_keys_updated)

	if trigger_zone:
		trigger_zone.body_entered.connect(_on_trigger_zone_entered)
	if exit_zone:
		exit_zone.body_entered.connect(_on_exit_zone_entered)

func _process(delta: float) -> void:
	if is_opening and open_progress < 1.0:
		open_progress = minf(1.0, open_progress + delta * 1.2)
		# Slide door up
		if door_leaf:
			door_leaf.position.y = lerpf(0.0, 3.8, open_progress)

func _on_keys_updated(count: int, _total: int) -> void:
	update_leds(count)
	if count >= 3 and not is_opening:
		open_door()

func update_leds(count: int) -> void:
	if led1: led1.material_override = green_mat if count >= 1 else red_mat
	if led2: led2.material_override = green_mat if count >= 2 else red_mat
	if led3: led3.material_override = green_mat if count >= 3 else red_mat

func open_door() -> void:
	is_opening = true
	SoundManager.play_sfx("door_open")

func _on_trigger_zone_entered(body: Node) -> void:
	if body == GameManager.player_node:
		if GameManager.keys_collected < 3:
			var now = Time.get_ticks_msec() / 1000.0
			if now - last_locked_sound_time > 1.2:
				last_locked_sound_time = now
				SoundManager.play_sfx("door_locked")

func _on_exit_zone_entered(body: Node) -> void:
	if body == GameManager.player_node and GameManager.keys_collected >= 3:
		GameManager.trigger_victory(
			"ТЫ СОХРАНИЛ ДЕВСТВЕННОСТЬ!",
			"Ты собрал все 3 золотых ключа, взломал бронедверь и вырвался на свободу!"
		)
