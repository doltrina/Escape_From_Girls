extends Area3D

@export_enum("forcefield", "energy_drink", "dakimakura", "d20_dice") var item_type: String = "forcefield"
@export var rotation_speed: float = 2.0
@export var bob_amplitude: float = 0.12
@export var bob_speed: float = 3.2

var time_passed: float = 0.0

@onready var visual_root: Node3D = $VisualRoot
@onready var mesh_forcefield: Node3D = $VisualRoot/MeshForcefield
@onready var mesh_energy_drink: Node3D = $VisualRoot/MeshEnergyDrink
@onready var mesh_dakimakura: Node3D = $VisualRoot/MeshDakimakura
@onready var mesh_d20: Node3D = $VisualRoot/MeshD20
@onready var omni_light: OmniLight3D = $VisualRoot/OmniLight3D

func _ready() -> void:
	body_entered.connect(_on_body_entered)
	update_visuals()

func update_visuals() -> void:
	if mesh_forcefield: mesh_forcefield.visible = (item_type == "forcefield")
	if mesh_energy_drink: mesh_energy_drink.visible = (item_type == "energy_drink")
	if mesh_dakimakura: mesh_dakimakura.visible = (item_type == "dakimakura")
	if mesh_d20: mesh_d20.visible = (item_type == "d20_dice")

	if omni_light:
		match item_type:
			"forcefield":
				omni_light.light_color = Color(0, 0.95, 1)
			"energy_drink":
				omni_light.light_color = Color(0.2, 1, 0.1)
			"dakimakura":
				omni_light.light_color = Color(1, 0.1, 0.8)
			"d20_dice":
				omni_light.light_color = Color(1, 0.7, 0)

func _process(delta: float) -> void:
	time_passed += delta
	if visual_root:
		visual_root.rotate_y(rotation_speed * delta)
		visual_root.position.y = sin(time_passed * bob_speed) * bob_amplitude

func _on_body_entered(body: Node) -> void:
	if body == GameManager.player_node or body.is_in_group("player"):
		GameManager.add_inventory_item(item_type, 1)
		queue_free()
