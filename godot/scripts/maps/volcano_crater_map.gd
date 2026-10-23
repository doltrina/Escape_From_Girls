extends Node3D

const PLATFORM_COUNT: int = 28
const CRATER_RADIUS: float = 28.0

@onready var world_root: Node3D = $World
@onready var items_root: Node3D = $Items
@onready var magma_body: Node3D = $Magma
@onready var magma_area: Area3D = $Magma/DamageArea
@onready var cutscene_overlay: Control = $CutsceneLayer/CutsceneOverlay

var magma_height: float = -4.0
var magma_rise_speed: float = 0.35
var basalt_mat: StandardMaterial3D
var magma_mat: StandardMaterial3D

var platforms: Array[Vector3] = []

func _ready() -> void:
	init_materials()
	if magma_body:
		magma_body.position.y = magma_height
	build_volcano_crater()
	build_prologue_city()
	GameManager.crater_platforms = platforms
	spawn_entities()
	if cutscene_overlay:
		cutscene_overlay.cutscene_completed.connect(_on_cutscene_completed)
		cutscene_overlay.start_cutscene(GameManager.MapType.CRATER)
	else:
		_start_nextbot_timer()

func _on_cutscene_completed() -> void:
	_start_nextbot_timer()

func _start_nextbot_timer() -> void:
	# 5 seconds delay after cutscene ends before Nextbot spawns
	await get_tree().create_timer(5.0).timeout
	if GameManager.current_state == GameManager.GameState.PLAYING:
		spawn_nextbot_delayed()

func spawn_nextbot_delayed() -> void:
	var nextbot_scene = load("res://scenes/nextbot_girl.tscn")
	if nextbot_scene:
		var bot = nextbot_scene.instantiate()
		var p0 = platforms[0]
		bot.position = p0 + Vector3(0, 1.5, 0)
		items_root.add_child(bot)
		SoundManager.play_sfx("door_locked")

func init_materials() -> void:
	basalt_mat = StandardMaterial3D.new()
	var basalt_tex = load("res://assets/textures/basalt.png")
	if basalt_tex: basalt_mat.albedo_texture = basalt_tex
	basalt_mat.roughness = 0.85
	basalt_mat.metallic = 0.1

	magma_mat = StandardMaterial3D.new()
	var magma_tex = load("res://assets/textures/magma.png")
	if magma_tex:
		magma_mat.albedo_texture = magma_tex
		magma_mat.emission_enabled = true
		magma_mat.emission_texture = magma_tex
		magma_mat.emission_energy_multiplier = 2.0
	magma_mat.roughness = 0.2

const PLATFORM_DEFS: Array = [
	# [pos, size]
	[Vector3(0.0, 1.8, 16.0), Vector3(12.0, 1.2, 10.0)],     # 0: Start Altar
	[Vector3(-6.5, 2.8, 15.0), Vector3(5.5, 1.0, 5.0)],     # 1: P1
	[Vector3(-11.5, 3.8, 12.0), Vector3(5.0, 1.0, 5.0)],    # 2: P2
	[Vector3(-16.0, 4.6, 7.5), Vector3(4.5, 1.0, 4.5)],     # 3: P3
	[Vector3(-19.5, 4.9, 1.5), Vector3(5.0, 1.0, 5.0)],     # 4: P4
	[Vector3(-19.0, 6.0, -4.5), Vector3(4.0, 0.8, 4.0)],    # 5: P5
	[Vector3(-16.5, 7.0, -10.0), Vector3(5.5, 1.2, 5.5)],   # 6: P6 (Key 1)
	[Vector3(-12.5, 8.2, -14.5), Vector3(3.6, 1.0, 3.6)],   # 7: P7
	[Vector3(-7.5, 9.4, -17.5), Vector3(5.0, 1.0, 4.5)],    # 8: P8
	[Vector3(-2.0, 10.7, -18.5), Vector3(5.5, 0.8, 3.0)],   # 9: P9
	[Vector3(4.0, 11.9, -18.0), Vector3(5.5, 0.8, 3.0)],    # 10: P10
	[Vector3(9.5, 13.1, -15.5), Vector3(4.5, 1.0, 4.5)],    # 11: P11
	[Vector3(14.5, 14.2, -11.5), Vector3(4.5, 0.8, 4.5)],   # 12: P12
	[Vector3(18.0, 15.3, -6.0), Vector3(4.0, 0.8, 3.5)],    # 13: P13
	[Vector3(19.5, 16.2, 0.0), Vector3(5.5, 1.2, 5.0)],     # 14: P14 (Key 2)
	[Vector3(18.0, 17.4, 5.5), Vector3(4.0, 0.8, 4.0)],     # 15: P15
	[Vector3(15.0, 18.2, 10.5), Vector3(4.5, 1.0, 4.5)],    # 16: P16
	[Vector3(10.5, 19.3, 14.5), Vector3(4.5, 1.0, 4.5)],    # 17: P17
	[Vector3(5.0, 20.5, 17.0), Vector3(5.5, 1.0, 4.5)],     # 18: P18
	[Vector3(-1.0, 21.7, 16.5), Vector3(5.0, 0.8, 3.0)],    # 19: P19
	[Vector3(-6.5, 23.0, 14.5), Vector3(5.0, 0.8, 3.0)],    # 20: P20
	[Vector3(-11.5, 24.2, 11.0), Vector3(4.0, 0.8, 4.0)],   # 21: P21
	[Vector3(-14.0, 25.4, 6.0), Vector3(5.5, 1.2, 5.0)],    # 22: P22 (Key 3)
	[Vector3(-13.0, 26.8, 0.5), Vector3(4.5, 1.2, 4.5)],    # 23: P23
	[Vector3(-10.5, 28.2, -4.5), Vector3(4.5, 1.2, 4.5)],   # 24: P24
	[Vector3(-6.5, 29.5, -7.5), Vector3(4.0, 1.2, 4.0)],    # 25: P25
	[Vector3(-1.5, 30.8, -7.5), Vector3(4.5, 1.2, 4.5)],    # 26: P26
	[Vector3(0.0, 32.0, 0.0), Vector3(14.0, 1.4, 14.0)]     # 27: Summit Arena
]

func build_volcano_crater() -> void:
	for def in PLATFORM_DEFS:
		var platform_pos: Vector3 = def[0]
		var p_size: Vector3 = def[1]
		platforms.append(platform_pos)

		var plat_body = StaticBody3D.new()
		plat_body.position = platform_pos

		var plat_mesh_instance = MeshInstance3D.new()
		var curr_mesh = BoxMesh.new()
		curr_mesh.size = p_size
		curr_mesh.material = basalt_mat
		plat_mesh_instance.mesh = curr_mesh
		plat_body.add_child(plat_mesh_instance)

		var col = CollisionShape3D.new()
		var box_col = BoxShape3D.new()
		box_col.size = p_size
		col.shape = box_col
		plat_body.add_child(col)

		world_root.add_child(plat_body)

	# Helicopter on the summit platform
	var peak_pos = platforms[platforms.size() - 1]
	build_helicopter_pad(peak_pos)

func build_helicopter_pad(pos: Vector3) -> void:
	# Torii Gate
	var gate_scene = Node3D.new()
	gate_scene.position = pos + Vector3(0, 0.5, 2.5)

	var gate_mat = StandardMaterial3D.new()
	gate_mat.albedo_color = Color(0.9, 0.1, 0.1)
	gate_mat.metallic = 0.5

	var post_mesh = BoxMesh.new()
	post_mesh.size = Vector3(0.4, 4.0, 0.4)
	post_mesh.material = gate_mat

	var post_l = MeshInstance3D.new()
	post_l.mesh = post_mesh
	post_l.position = Vector3(-2.0, 2.0, 0)
	gate_scene.add_child(post_l)

	var post_r = MeshInstance3D.new()
	post_r.mesh = post_mesh
	post_r.position = Vector3(2.0, 2.0, 0)
	gate_scene.add_child(post_r)

	var beam_mesh = BoxMesh.new()
	beam_mesh.size = Vector3(5.0, 0.5, 0.6)
	beam_mesh.material = gate_mat
	var top_beam = MeshInstance3D.new()
	top_beam.mesh = beam_mesh
	top_beam.position = Vector3(0, 3.8, 0)
	gate_scene.add_child(top_beam)

	world_root.add_child(gate_scene)

	# Rescue Helicopter
	var heli = Node3D.new()
	heli.position = pos + Vector3(0.0, 1.9, -1.0) # Resting directly on summit platform
	heli.rotation.y = deg_to_rad(-85.0) # Turned sideways so side door and Mactraher are clearly visible!

	var heli_mat = StandardMaterial3D.new()
	heli_mat.albedo_color = Color(0.18, 0.42, 0.22)
	heli_mat.metallic = 0.65
	heli_mat.roughness = 0.35

	# Fuselage Body
	var body_mesh = BoxMesh.new()
	body_mesh.size = Vector3(2.2, 1.8, 4.4)
	body_mesh.material = heli_mat
	var body_inst = MeshInstance3D.new()
	body_inst.mesh = body_mesh
	heli.add_child(body_inst)

	# Cockpit glass (front)
	var glass_mat = StandardMaterial3D.new()
	glass_mat.albedo_color = Color(0.1, 0.2, 0.35, 0.8)
	glass_mat.metallic = 0.9
	glass_mat.roughness = 0.1
	var glass_mesh = BoxMesh.new()
	glass_mesh.size = Vector3(2.0, 1.0, 1.1)
	glass_mesh.material = glass_mat
	var glass_inst = MeshInstance3D.new()
	glass_inst.mesh = glass_mesh
	glass_inst.position = Vector3(0, 0.25, 1.8)
	heli.add_child(glass_inst)

	# Tail boom
	var tail_mesh = BoxMesh.new()
	tail_mesh.size = Vector3(0.45, 0.5, 3.2)
	tail_mesh.material = heli_mat
	var tail_inst = MeshInstance3D.new()
	tail_inst.mesh = tail_mesh
	tail_inst.position = Vector3(0, 0.35, -3.2)
	heli.add_child(tail_inst)

	# Vertical tail fin
	var fin_mesh = BoxMesh.new()
	fin_mesh.size = Vector3(0.15, 1.3, 0.7)
	fin_mesh.material = heli_mat
	var fin_inst = MeshInstance3D.new()
	fin_inst.mesh = fin_mesh
	fin_inst.position = Vector3(0, 0.9, -4.5)
	heli.add_child(fin_inst)

	# Landing Skids (allowing helicopter to stand cleanly on platform)
	var skid_mat = StandardMaterial3D.new()
	skid_mat.albedo_color = Color(0.15, 0.15, 0.17)
	skid_mat.metallic = 0.8
	var skid_mesh = BoxMesh.new()
	skid_mesh.size = Vector3(0.12, 0.1, 4.4)
	skid_mesh.material = skid_mat

	var left_skid = MeshInstance3D.new()
	left_skid.mesh = skid_mesh
	left_skid.position = Vector3(-0.95, -0.95, 0.0)
	heli.add_child(left_skid)

	var right_skid = MeshInstance3D.new()
	right_skid.mesh = skid_mesh
	right_skid.position = Vector3(0.95, -0.95, 0.0)
	heli.add_child(right_skid)

	# Skid struts
	var strut_mesh = BoxMesh.new()
	strut_mesh.size = Vector3(0.1, 0.4, 0.1)
	strut_mesh.material = skid_mat
	for sx in [-0.95, 0.95]:
		for sz in [-1.2, 1.2]:
			var strut = MeshInstance3D.new()
			strut.mesh = strut_mesh
			strut.position = Vector3(sx, -0.75, sz)
			heli.add_child(strut)

	# Spotlight down
	var spot = SpotLight3D.new()
	spot.light_color = Color(1, 0.95, 0.8)
	spot.light_energy = 3.5
	spot.spot_range = 35.0
	spot.spot_angle = 35.0
	spot.rotation.x = -PI / 2.0
	spot.position = Vector3(0, -0.8, 1.0)
	heli.add_child(spot)

	# Passenger Cabin Door Cutout Frame (side doorway where Mactraher sits)
	var door_frame_mat = StandardMaterial3D.new()
	door_frame_mat.albedo_color = Color(0.08, 0.08, 0.1)
	var door_bg = MeshInstance3D.new()
	var door_bg_mesh = BoxMesh.new()
	door_bg_mesh.size = Vector3(0.08, 1.15, 1.1)
	door_bg_mesh.material = door_frame_mat
	door_bg.mesh = door_bg_mesh
	door_bg.position = Vector3(1.08, 0.1, 0.35)
	heli.add_child(door_bg)

	# Mactraher sitting inside the side passenger cabin window/door
	var friend_sprite = Sprite3D.new()
	var friend_tex = load("res://assets/textures/mactraher.png")
	if friend_tex:
		friend_sprite.texture = friend_tex
	# Scaled to fit passenger seat: 1024px * 0.00095 = ~0.97m height
	friend_sprite.pixel_size = 0.00095
	friend_sprite.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	friend_sprite.position = Vector3(1.16, 0.12, 0.35)
	friend_sprite.name = "FriendSprite"
	heli.add_child(friend_sprite)

	# Rotor blade on top
	var rotor = MeshInstance3D.new()
	var r_mesh = BoxMesh.new()
	r_mesh.size = Vector3(7.2, 0.08, 0.45)
	var r_mat = StandardMaterial3D.new()
	r_mat.albedo_color = Color(0.12, 0.12, 0.15)
	r_mat.metallic = 0.8
	r_mesh.material = r_mat
	rotor.mesh = r_mesh
	rotor.position = Vector3(0, 1.05, 0)
	rotor.name = "Rotor"
	heli.add_child(rotor)

	# Tail rotor
	var tail_rotor = MeshInstance3D.new()
	var tr_mesh = BoxMesh.new()
	tr_mesh.size = Vector3(0.05, 1.4, 0.18)
	tr_mesh.material = r_mat
	tail_rotor.mesh = tr_mesh
	tail_rotor.position = Vector3(0.12, 0.9, -4.5)
	tail_rotor.name = "TailRotor"
	heli.add_child(tail_rotor)

	GameManager.helicopter_node = heli
	world_root.add_child(heli)

	# Evacuation trigger area
	var evac_area = Area3D.new()
	evac_area.position = pos + Vector3(0, 1.5, 0)
	evac_area.collision_layer = 0
	evac_area.collision_mask = 2

	var evac_col = CollisionShape3D.new()
	var evac_box = BoxShape3D.new()
	evac_box.size = Vector3(8.0, 4.0, 8.0)
	evac_col.shape = evac_box
	evac_area.add_child(evac_col)
	evac_area.body_entered.connect(_on_evacuation_reached)
	world_root.add_child(evac_area)

func spawn_entities() -> void:
	# 1. Player at start (spawns on city sidewalk standing cleanly on ground without touching canopy)
	var player_scene = load("res://scenes/player.tscn")
	if player_scene:
		var player = player_scene.instantiate()
		player.position = GameManager.city_origin + Vector3(-1.8, 0.3, 5.5)
		player.rotation = Vector3.ZERO
		player.can_double_jump = true # Enable double jump for volcano parkour
		items_root.add_child(player)

	# 2. Golden Keys on Altars (P6, P14, P22)
	var key_scene = load("res://scenes/key_item.tscn")
	if key_scene:
		var key_indices = [6, 14, 22]
		for k_idx in key_indices:
			var k = key_scene.instantiate()
			k.position = platforms[k_idx] + Vector3(0, 1.2, 0)
			items_root.add_child(k)

	# 4. Pickups along the ascent
	var pickup_scene = load("res://scenes/pickup_item.tscn")
	if pickup_scene:
		var pickup_indices = [2, 8, 13, 18, 24]
		var types = ["energy_drink", "forcefield", "d20_dice", "energy_drink", "dakimakura"]
		for idx in range(pickup_indices.size()):
			var p_idx = pickup_indices[idx]
			var item = pickup_scene.instantiate()
			item.item_type = types[idx]
			item.position = platforms[p_idx] + Vector3(0, 1.2, 0)
			items_root.add_child(item)

func _process(delta: float) -> void:
	if GameManager.helicopter_node and is_instance_valid(GameManager.helicopter_node):
		var rotor = GameManager.helicopter_node.get_node_or_null("Rotor")
		if rotor:
			rotor.rotate_y(delta * 28.0)
		var tail_rotor = GameManager.helicopter_node.get_node_or_null("TailRotor")
		if tail_rotor:
			tail_rotor.rotate_x(delta * 40.0)

	if GameManager.current_state == GameManager.GameState.PLAYING:
		# Magma rises continuously during active gameplay!
		magma_height += magma_rise_speed * delta
		if magma_body:
			magma_body.position.y = magma_height

func _physics_process(_delta: float) -> void:
	if GameManager.current_state == GameManager.GameState.PLAYING:
		var player = GameManager.player_node
		if player and is_instance_valid(player) and player.global_position.y <= (magma_height + 0.35):
			on_magma_death()

func on_magma_death() -> void:
	SoundManager.play_sfx("magma_death")
	GameManager.trigger_game_over(
		"🩸 УТОНУЛ В МЕСЯЧНЫХ!",
		"«Ой, кажется, ты упал в мои месячные... А я даже не успела познакомиться!»"
	)

func _on_evacuation_reached(body: Node) -> void:
	if body == GameManager.player_node:
		GameManager.trigger_victory(
			"🌋 ТЫ ВЫБРАЛСЯ ИЗ КРАТЕРА!",
			"Ты покорил все 28 платформ, спасся от бушующих месячных и улетел на вертолете!"
		)

func build_prologue_city() -> void:
	var city_root = Node3D.new()
	city_root.position = GameManager.city_origin
	city_root.name = "PrologueCity"

	# 1. Road (dark asphalt with dashed white divider)
	var road_body = StaticBody3D.new()
	var road_mesh = BoxMesh.new()
	road_mesh.size = Vector3(16.0, 0.4, 40.0)
	var road_mat = StandardMaterial3D.new()
	road_mat.albedo_color = Color(0.12, 0.12, 0.14)
	road_mat.roughness = 0.9
	road_mesh.material = road_mat
	var road_inst = MeshInstance3D.new()
	road_inst.mesh = road_mesh
	road_body.add_child(road_inst)

	var road_col = CollisionShape3D.new()
	var road_box = BoxShape3D.new()
	road_box.size = road_mesh.size
	road_col.shape = road_box
	road_body.add_child(road_col)
	road_body.position = Vector3(6.0, -0.2, 0.0)
	city_root.add_child(road_body)

	# Road Divider Lines
	for z_pos in range(-16, 17, 4):
		var line_mesh = BoxMesh.new()
		line_mesh.size = Vector3(0.3, 0.02, 2.0)
		var line_mat = StandardMaterial3D.new()
		line_mat.albedo_color = Color(1.0, 1.0, 1.0)
		line_mesh.material = line_mat
		var line_inst = MeshInstance3D.new()
		line_inst.mesh = line_mesh
		line_inst.position = Vector3(6.0, 0.02, float(z_pos))
		city_root.add_child(line_inst)

	# 2. Sidewalk (concrete tiles where player walks)
	var sw_body = StaticBody3D.new()
	var sw_mesh = BoxMesh.new()
	sw_mesh.size = Vector3(8.0, 0.6, 40.0)
	var sw_mat = StandardMaterial3D.new()
	sw_mat.albedo_color = Color(0.32, 0.33, 0.36)
	sw_mat.roughness = 0.8
	sw_mesh.material = sw_mat
	var sw_inst = MeshInstance3D.new()
	sw_inst.mesh = sw_mesh
	sw_body.add_child(sw_inst)

	var sw_col = CollisionShape3D.new()
	var sw_box = BoxShape3D.new()
	sw_box.size = sw_mesh.size
	sw_col.shape = sw_box
	sw_body.add_child(sw_col)
	sw_body.position = Vector3(-4.0, 0.0, 0.0)
	city_root.add_child(sw_body)

	# 3. Buildings (a couple of city houses with glowing windows)
	var house_configs = [
		{"pos": Vector3(-13.0, 7.0, -12.0), "size": Vector3(8.0, 14.0, 10.0), "color": Color(0.25, 0.22, 0.28)},
		{"pos": Vector3(-13.0, 9.0, 0.0), "size": Vector3(8.0, 18.0, 11.0), "color": Color(0.18, 0.20, 0.25)},
		{"pos": Vector3(-13.0, 6.0, 12.0), "size": Vector3(8.0, 12.0, 9.0), "color": Color(0.30, 0.24, 0.20)}
	]
	for h in house_configs:
		var house = MeshInstance3D.new()
		var hm = BoxMesh.new()
		hm.size = h["size"]
		var h_mat = StandardMaterial3D.new()
		h_mat.albedo_color = h["color"]
		hm.material = h_mat
		house.mesh = hm
		house.position = h["pos"]
		city_root.add_child(house)

		# Glowing windows on buildings
		for wy in range(3, int(h["size"].y) - 2, 3):
			for wz in [-2.5, 2.5]:
				var win = MeshInstance3D.new()
				var wm = BoxMesh.new()
				wm.size = Vector3(0.1, 1.4, 1.2)
				var w_mat = StandardMaterial3D.new()
				w_mat.albedo_color = Color(1.0, 0.9, 0.6)
				w_mat.emission_enabled = true
				w_mat.emission = Color(1.0, 0.85, 0.4)
				w_mat.emission_energy_multiplier = 2.0
				wm.material = w_mat
				win.mesh = wm
				win.position = h["pos"] + Vector3(h["size"].x * 0.5 + 0.06, float(wy) - h["size"].y * 0.5, wz)
				city_root.add_child(win)

	# 4. Bus Stop (Павильон остановки: навес со стеклом, скамейка и знак)
	var stop_root = Node3D.new()
	stop_root.position = Vector3(-2.2, 0.3, 8.0)

	var canopy = MeshInstance3D.new()
	var cm = BoxMesh.new()
	cm.size = Vector3(2.6, 0.12, 4.4)
	var c_mat = StandardMaterial3D.new()
	c_mat.albedo_color = Color(0.15, 0.25, 0.35)
	c_mat.metallic = 0.7
	canopy.mesh = cm
	canopy.material_override = c_mat
	canopy.position = Vector3(0, 3.2, 0)
	stop_root.add_child(canopy)

	var glass = MeshInstance3D.new()
	var gm = BoxMesh.new()
	gm.size = Vector3(0.08, 3.1, 4.2)
	var g_mat = StandardMaterial3D.new()
	g_mat.albedo_color = Color(0.2, 0.5, 0.7, 0.45)
	g_mat.roughness = 0.1
	glass.mesh = gm
	glass.material_override = g_mat
	glass.position = Vector3(-1.2, 1.55, 0)
	stop_root.add_child(glass)

	var bench = MeshInstance3D.new()
	var bm = BoxMesh.new()
	bm.size = Vector3(0.6, 0.45, 2.4)
	var b_mat = StandardMaterial3D.new()
	b_mat.albedo_color = Color(0.45, 0.28, 0.15)
	bench.mesh = bm
	bench.material_override = b_mat
	bench.position = Vector3(-0.6, 0.25, 0)
	stop_root.add_child(bench)

	var pole = MeshInstance3D.new()
	var pm = BoxMesh.new()
	pm.size = Vector3(0.12, 3.6, 0.12)
	var p_mat = StandardMaterial3D.new()
	p_mat.albedo_color = Color(0.2, 0.2, 0.25)
	pole.mesh = pm
	pole.material_override = p_mat
	pole.position = Vector3(1.1, 1.8, -2.5)
	stop_root.add_child(pole)

	var sign_board = MeshInstance3D.new()
	var sbm = BoxMesh.new()
	sbm.size = Vector3(0.08, 0.7, 0.7)
	var sb_mat = StandardMaterial3D.new()
	sb_mat.albedo_color = Color(0.1, 0.45, 0.9)
	sign_board.mesh = sbm
	sign_board.material_override = sb_mat
	sign_board.position = Vector3(1.1, 3.5, -2.5)
	stop_root.add_child(sign_board)

	city_root.add_child(stop_root)

	# 5. Cars (Парковка / машины на дороге)
	var car1 = build_simple_car(Color(0.15, 0.35, 0.75))
	car1.position = Vector3(4.0, 0.45, 5.0)
	city_root.add_child(car1)

	var car2 = build_simple_car(Color(0.85, 0.75, 0.15))
	car2.position = Vector3(8.5, 0.45, -6.0)
	city_root.add_child(car2)

	# 6. Street Lamps with warm light
	for lz in [6.5, -6.0]:
		var lamp_pole = MeshInstance3D.new()
		var lpm = BoxMesh.new()
		lpm.size = Vector3(0.15, 5.0, 0.15)
		var lp_mat = StandardMaterial3D.new()
		lp_mat.albedo_color = Color(0.18, 0.18, 0.2)
		lamp_pole.mesh = lpm
		lamp_pole.material_override = lp_mat
		lamp_pole.position = Vector3(-0.6, 2.5, lz)
		city_root.add_child(lamp_pole)

		var lamp_light = SpotLight3D.new()
		lamp_light.light_color = Color(1.0, 0.92, 0.75)
		lamp_light.light_energy = 4.0
		lamp_light.spot_range = 14.0
		lamp_light.spot_angle = 50.0
		lamp_light.rotation.x = -PI / 2.0
		lamp_light.position = Vector3(-0.6, 4.8, lz)
		city_root.add_child(lamp_light)

	# 7. 3D Girl Nextbot standing on sidewalk ahead under the lamp directly in player's forward view
	var girl_sprite = Sprite3D.new()
	girl_sprite.texture = GameManager.get_girl_texture()
	girl_sprite.pixel_size = 0.0028
	girl_sprite.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	girl_sprite.position = Vector3(-1.6, 1.4, -6.0) # Directly ahead in front of the player along -Z!
	girl_sprite.name = "CityGirl3D"
	city_root.add_child(girl_sprite)
	GameManager.city_girl_node = girl_sprite

	world_root.add_child(city_root)

func build_simple_car(car_color: Color) -> Node3D:
	var car = Node3D.new()
	var body_m = BoxMesh.new()
	body_m.size = Vector3(2.0, 0.7, 4.2)
	var body_mat = StandardMaterial3D.new()
	body_mat.albedo_color = car_color
	body_mat.metallic = 0.6
	body_mat.roughness = 0.3
	var body = MeshInstance3D.new()
	body.mesh = body_m
	body.material_override = body_mat
	body.position = Vector3(0, 0.35, 0)
	car.add_child(body)

	var roof_m = BoxMesh.new()
	roof_m.size = Vector3(1.7, 0.6, 2.2)
	var roof_mat = StandardMaterial3D.new()
	roof_mat.albedo_color = Color(0.1, 0.15, 0.2, 0.8)
	roof_mat.roughness = 0.1
	var roof = MeshInstance3D.new()
	roof.mesh = roof_m
	roof.material_override = roof_mat
	roof.position = Vector3(0, 0.95, -0.2)
	car.add_child(roof)

	for hx in [-0.7, 0.7]:
		var hl = MeshInstance3D.new()
		var hlm = BoxMesh.new()
		hlm.size = Vector3(0.3, 0.2, 0.1)
		var hl_mat = StandardMaterial3D.new()
		hl_mat.albedo_color = Color(1.0, 1.0, 0.9)
		hl_mat.emission_enabled = true
		hl_mat.emission = Color(1.0, 1.0, 0.9)
		hl.mesh = hlm
		hl.material_override = hl_mat
		hl.position = Vector3(hx, 0.4, 2.1)
		car.add_child(hl)

	for wx in [-1.05, 1.05]:
		for wz in [-1.3, 1.3]:
			var wheel = MeshInstance3D.new()
			var wm = CylinderMesh.new()
			wm.top_radius = 0.35
			wm.bottom_radius = 0.35
			wm.height = 0.2
			var w_mat = StandardMaterial3D.new()
			w_mat.albedo_color = Color(0.12, 0.12, 0.12)
			wheel.mesh = wm
			wheel.material_override = w_mat
			wheel.rotation.z = PI / 2.0
			wheel.position = Vector3(wx, 0.15, wz)
			car.add_child(wheel)

	return car
