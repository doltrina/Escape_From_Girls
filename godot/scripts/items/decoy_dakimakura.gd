extends Node3D

var lifetime: float = 5.5

@onready var light: OmniLight3D = $OmniLight3D

func _process(delta: float) -> void:
	lifetime -= delta
	rotate_y(delta * 2.0)
	if lifetime <= 0.0:
		queue_free()
