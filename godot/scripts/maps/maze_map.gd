extends Node3D

const TILE_SIZE: float = 4.0
const WALL_HEIGHT: float = 4.2

const GRID: Array = [
	[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
	[1,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
	[1,0,1,1,0,0,1,0,1,1,1,0,0,1,0,1,1,1,1,1,0,1],
	[1,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,1],
	[1,0,1,0,1,1,1,1,0,0,1,1,1,1,1,0,1,1,0,1,0,1],
	[1,0,0,0,1,0,0,1,0,0,0,0,0,0,1,0,0,1,0,0,0,1],
	[1,1,1,0,1,0,0,1,0,1,1,1,0,0,1,1,0,1,0,1,1,1],
	[1,0,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0,0,0,1],
	[1,0,1,1,1,0,1,1,0,1,0,1,0,1,1,0,1,1,1,1,0,1],
	[1,0,0,0,1,0,1,0,0,0,0,0,0,0,1,0,1,0,0,0,0,1],
	[1,1,1,0,1,0,1,0,1,1,0,0,1,0,1,0,1,0,1,1,1,1],
	[1,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,1],
	[1,0,1,1,1,1,0,0,1,1,1,1,1,0,0,1,1,1,1,1,0,1],
	[1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1],
	[1,1,1,0,0,1,1,1,0,1,1,1,0,1,1,1,0,0,1,1,1,1],
	[1,0,0,0,0,0,0,1,0,1,0,1,0,1,0,0,0,0,0,0,0,1],
	[1,0,1,1,1,1,0,1,0,1,0,1,0,1,0,1,1,1,1,1,0,1],
	[1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1],
	[1,1,1,0,0,1,0,1,1,1,1,1,1,1,0,1,0,0,1,1,1,1],
	[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
	[1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1],
	[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
]

@onready var world_root: Node3D = $World
@onready var items_root: Node3D = $Items
@onready var cutscene_overlay: Control = $CutsceneLayer/CutsceneOverlay

var wall_mat: StandardMaterial3D
var floor_mat: StandardMaterial3D
var ceiling_mat: StandardMaterial3D

func _ready() -> void:
	init_materials()
	build_maze()
	spawn_game_entities()
	if cutscene_overlay:
		cutscene_overlay.start_cutscene(GameManager.MapType.MAZE)

func init_materials() -> void:
	wall_mat = StandardMaterial3D.new()
	var wall_tex = load("res://assets/textures/wall.png")
	if wall_tex:
		wall_mat.albedo_texture = wall_tex
	wall_mat.roughness = 0.8
	wall_mat.metallic = 0.0
	wall_mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	wall_mat.uv1_triplanar = true
	wall_mat.uv1_world_triplanar = true
	wall_mat.uv1_scale = Vector3(1.0 / TILE_SIZE, 1.0 / WALL_HEIGHT, 1.0 / TILE_SIZE)

	floor_mat = StandardMaterial3D.new()
	var floor_tex = load("res://assets/textures/floor.png")
	if floor_tex:
		floor_mat.albedo_texture = floor_tex
		floor_mat.uv1_scale = Vector3(22, 22, 1)
	floor_mat.roughness = 0.7
	floor_mat.metallic = 0.1

	ceiling_mat = StandardMaterial3D.new()
	var ceil_tex = load("res://assets/textures/ceiling.png")
	if ceil_tex:
		ceiling_mat.albedo_texture = ceil_tex
		ceiling_mat.uv1_scale = Vector3(22, 22, 1)
	ceiling_mat.roughness = 0.9

func build_maze() -> void:
	var rows = GRID.size()
	var cols = GRID[0].size()
	var width = cols * TILE_SIZE
	var depth = rows * TILE_SIZE
	var offset_x = -width / 2.0
	var offset_z = -depth / 2.0

	# 1. Floor
	var floor_static = StaticBody3D.new()
	var floor_mesh = MeshInstance3D.new()
	var p_mesh = PlaneMesh.new()
	p_mesh.size = Vector2(width, depth)
	p_mesh.material = floor_mat
	floor_mesh.mesh = p_mesh
	floor_static.add_child(floor_mesh)

	var floor_col = CollisionShape3D.new()
	var box_floor = BoxShape3D.new()
	box_floor.size = Vector3(width, 0.2, depth)
	floor_col.shape = box_floor
	floor_col.position.y = -0.1
	floor_static.add_child(floor_col)
	world_root.add_child(floor_static)

	# 2. Ceiling
	var ceiling_mesh = MeshInstance3D.new()
	var c_mesh = PlaneMesh.new()
	c_mesh.size = Vector2(width, depth)
	c_mesh.material = ceiling_mat
	ceiling_mesh.mesh = c_mesh
	ceiling_mesh.rotation.x = PI
	ceiling_mesh.position.y = WALL_HEIGHT
	world_root.add_child(ceiling_mesh)

	# Ceiling collider to stop rocket jumps from escaping
	var ceil_static = StaticBody3D.new()
	var ceil_col = CollisionShape3D.new()
	var box_ceil = BoxShape3D.new()
	box_ceil.size = Vector3(width, 0.2, depth)
	ceil_col.shape = box_ceil
	ceil_col.position.y = WALL_HEIGHT + 0.1
	ceil_static.add_child(ceil_col)
	world_root.add_child(ceil_static)

	# 3. Walls
	var box_geo = BoxMesh.new()
	box_geo.size = Vector3(TILE_SIZE, WALL_HEIGHT, TILE_SIZE)
	box_geo.material = wall_mat

	var box_shape = BoxShape3D.new()
	box_shape.size = Vector3(TILE_SIZE, WALL_HEIGHT, TILE_SIZE)

	for r in range(rows):
		for c in range(cols):
			# Leave gap at top for exit door (row 0, col 10-11)
			if r == 0 and (c == 10 or c == 11):
				continue

			if GRID[r][c] == 1:
				var x = offset_x + c * TILE_SIZE + TILE_SIZE / 2.0
				var z = offset_z + r * TILE_SIZE + TILE_SIZE / 2.0

				var wall_body = StaticBody3D.new()
				wall_body.position = Vector3(x, WALL_HEIGHT / 2.0, z)

				var wall_instance = MeshInstance3D.new()
				wall_instance.mesh = box_geo
				wall_body.add_child(wall_instance)

				var wall_c = CollisionShape3D.new()
				wall_c.shape = box_shape
				wall_body.add_child(wall_c)

				world_root.add_child(wall_body)

	# 4. Corridor Neon Tube Lights
	var light_positions = [
		[3, 3, Color(0.0, 0.95, 1.0)],
		[11, 3, Color(1.0, 0.0, 0.35)],
		[18, 3, Color(0.0, 0.95, 1.0)],
		[3, 11, Color(1.0, 0.65, 0.0)],
		[11, 11, Color(0.0, 0.95, 1.0)],
		[19, 11, Color(0.6, 0.0, 1.0)],
		[3, 18, Color(0.0, 0.95, 1.0)],
		[11, 18, Color(1.0, 0.65, 0.0)],
		[18, 18, Color(1.0, 0.0, 0.35)]
	]
	for lp in light_positions:
		var c = lp[0]
		var r = lp[1]
		var col: Color = lp[2]
		var w_pos = grid_to_world(r, c)

		var fixture = MeshInstance3D.new()
		var fix_box = BoxMesh.new()
		fix_box.size = Vector3(1.8, 0.15, 0.4)
		var fix_mat = StandardMaterial3D.new()
		fix_mat.albedo_color = col
		fix_mat.emission_enabled = true
		fix_mat.emission = col
		fix_mat.emission_energy_multiplier = 3.0
		fix_box.material = fix_mat
		fixture.mesh = fix_box
		fixture.position = Vector3(w_pos.x, WALL_HEIGHT - 0.1, w_pos.z)
		world_root.add_child(fixture)

		var olight = OmniLight3D.new()
		olight.light_color = col
		olight.light_energy = 2.2
		olight.omni_range = 14.0
		olight.omni_attenuation = 1.2
		olight.position = Vector3(w_pos.x, WALL_HEIGHT - 0.5, w_pos.z)
		world_root.add_child(olight)

func grid_to_world(r: int, c: int) -> Vector3:
	var rows = GRID.size()
	var cols = GRID[0].size()
	var width = cols * TILE_SIZE
	var depth = rows * TILE_SIZE
	var offset_x = -width / 2.0
	var offset_z = -depth / 2.0
	var x = offset_x + c * TILE_SIZE + TILE_SIZE / 2.0
	var z = offset_z + r * TILE_SIZE + TILE_SIZE / 2.0
	return Vector3(x, 0, z)

func spawn_game_entities() -> void:
	# 1. Exit Door at North Wall (row 0, col 10.5)
	var door_scene = load("res://scenes/exit_door.tscn")
	if door_scene:
		var door = door_scene.instantiate()
		items_root.add_child(door)
		var p1 = grid_to_world(0, 10)
		var p2 = grid_to_world(0, 11)
		door.position = (p1 + p2) / 2.0

	# 2. 3 Golden Keys in 3 distinct wings
	var key_scene = load("res://scenes/key_item.tscn")
	if key_scene:
		var key_coords = [
			Vector2i(5, 2),    # West wing
			Vector2i(5, 19),   # East wing
			Vector2i(17, 10)   # Deep deadly dead end
		]
		for coord in key_coords:
			var key = key_scene.instantiate()
			items_root.add_child(key)
			var w_pos = grid_to_world(coord.x, coord.y)
			key.position = Vector3(w_pos.x, 1.2, w_pos.z)

	# 3. Pickups around the maze
	var pickup_scene = load("res://scenes/pickup_item.tscn")
	if pickup_scene:
		var pickup_defs = [
			{"type": "forcefield", "pos": Vector2i(7, 4)},
			{"type": "energy_drink", "pos": Vector2i(13, 8)},
			{"type": "dakimakura", "pos": Vector2i(9, 14)},
			{"type": "d20_dice", "pos": Vector2i(3, 17)},
			{"type": "forcefield", "pos": Vector2i(15, 17)},
			{"type": "energy_drink", "pos": Vector2i(1, 15)}
		]
		for p in pickup_defs:
			var item = pickup_scene.instantiate()
			item.item_type = p["type"]
			items_root.add_child(item)
			var w_pos = grid_to_world(p["pos"].x, p["pos"].y)
			item.position = Vector3(w_pos.x, 0.8, w_pos.z)

	# 4. Nextbot Girl spawn (far top-left corner, row 1, col 1)
	var nextbot_scene = load("res://scenes/nextbot_girl.tscn")
	if nextbot_scene:
		var bot = nextbot_scene.instantiate()
		items_root.add_child(bot)
		var bot_pos = grid_to_world(1, 1)
		bot.position = Vector3(bot_pos.x, 0.5, bot_pos.z)

	# 5. Player spawn (safe bottom area, row 19, col 10)
	var player_scene = load("res://scenes/player.tscn")
	if player_scene:
		var player = player_scene.instantiate()
		var start_pos = grid_to_world(19, 10)
		player.position = Vector3(start_pos.x, 1.0, start_pos.z)
		player.rotation.y = deg_to_rad(-90.0) # Look down open hallway towards West
		items_root.add_child(player)
