extends Area3D

@export var rotation_speed: float = 2.5
@export var bob_amplitude: float = 0.15
@export var bob_speed: float = 3.0

var initial_y: float = 0.0
var time_passed: float = 0.0

@onready var visual_root: Node3D = $VisualRoot

func _ready() -> void:
	initial_y = position.y
	body_entered.connect(_on_body_entered)

func _process(delta: float) -> void:
	time_passed += delta
	if visual_root:
		visual_root.rotate_y(rotation_speed * delta)
		visual_root.position.y = sin(time_passed * bob_speed) * bob_amplitude

func _on_body_entered(body: Node) -> void:
	if body == GameManager.player_node or body.is_in_group("player"):
		GameManager.collect_key()
		queue_free()
