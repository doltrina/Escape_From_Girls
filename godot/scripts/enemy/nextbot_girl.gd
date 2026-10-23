extends CharacterBody3D

@export var base_speed: float = 9.8
@export var acceleration: float = 35.0
@export var target_height: float = 2.1
@export var catch_distance: float = 1.35

var current_speed: float = 9.8
var target_pos: Vector3 = Vector3.ZERO
var distracted_timer: float = 0.0
var stunned_timer: float = 0.0
var bob_timer: float = 0.0

# Waypoint navigation & anti-stuck
var current_waypoint: Vector3 = Vector3.ZERO
var path_update_timer: float = 0.0
var last_pos: Vector3 = Vector3.ZERO
var stuck_timer: float = 0.0

# Volcano Crater platform parkour navigation
var crater_plat_idx: int = 0
var is_jumping_plat: bool = false
var jump_plat_progress: float = 0.0
var jump_plat_duration: float = 0.7
var jump_plat_from: Vector3 = Vector3.ZERO
var jump_plat_to: Vector3 = Vector3.ZERO

@onready var sprite: Sprite3D = $Sprite3D
@onready var aura_light: OmniLight3D = $AuraLight
@onready var catch_area: Area3D = $CatchArea

func _ready() -> void:
	GameManager.nextbot_node = self
	base_speed = GameManager.nextbot_base_speed
	current_speed = base_speed
	last_pos = global_position
	apply_preset_texture()
	if catch_area:
		catch_area.body_entered.connect(_on_body_entered)

func apply_preset_texture() -> void:
	if sprite:
		var tex = GameManager.get_girl_texture()
		if tex:
			sprite.texture = tex

func _physics_process(delta: float) -> void:
	if GameManager.current_state != GameManager.GameState.PLAYING:
		return

	# Handle stun / repel recovery
	if stunned_timer > 0.0:
		stunned_timer -= delta
		velocity = velocity.lerp(Vector3.ZERO, delta * 3.5)
		move_and_slide()
		return

	var player = GameManager.player_node
	if not player or not is_instance_valid(player):
		return

	var dist_to_player = global_position.distance_to(player.global_position)
	SoundManager.update_nextbot_distance(dist_to_player)

	# Active shield repel
	if GameManager.shield_active and dist_to_player < 3.2:
		repel(24.0)
		return

	# Scale speed slightly with survival time
	var speed_boost = minf(GameManager.elapsed_time / 40.0, 0.4) * 2.2
	current_speed = base_speed + speed_boost

	# Determine target position
	if distracted_timer > 0.0:
		distracted_timer -= delta
	else:
		target_pos = player.global_position

	# Billboard orientation: face player camera
	var look_target = player.global_position
	look_target.y = global_position.y
	if global_position.distance_to(look_target) > 0.01:
		look_at(look_target, Vector3.UP)

	# -------------------------------------------------------------
	# VOLCANO CRATER: Spider Wall Climbing & Center Leap
	# -------------------------------------------------------------
	if GameManager.current_map == GameManager.MapType.CRATER:
		handle_crater_movement(delta, player, dist_to_player)
	else:
		# ---------------------------------------------------------
		# MAZE: BFS Grid Navigation & Corner Smoothing
		# ---------------------------------------------------------
		handle_maze_movement(delta, player, dist_to_player)

	# Check catch condition
	if dist_to_player <= catch_distance and stunned_timer <= 0.0:
		catch_player()

func handle_maze_movement(delta: float, player: Node3D, dist_to_player: float) -> void:
	# Update path waypoint periodically
	path_update_timer -= delta
	if path_update_timer <= 0.0:
		path_update_timer = 0.12
		update_maze_waypoint(target_pos)

	var move_target = current_waypoint if current_waypoint != Vector3.ZERO else target_pos
	var dir = (move_target - global_position)
	dir.y = 0.0

	if dir.length() > 0.15:
		dir = dir.normalized()

		# Nextbot rhythmic bobbing
		bob_timer += delta * 14.0
		sprite.position.y = 1.05 + sin(bob_timer) * 0.09

		var target_vel = dir * current_speed

		# Anti-stuck corner glide
		var dist_moved = global_position.distance_to(last_pos)
		last_pos = global_position

		if dist_moved < (current_speed * delta * 0.25):
			stuck_timer += delta
			if stuck_timer > 0.2:
				# Apply perpendicular slide around the wall corner
				var tangent = Vector3(-dir.z, 0.0, dir.x)
				var sign_slide = 1.0 if sin(Time.get_ticks_msec() * 0.008) > 0.0 else -1.0
				target_vel += tangent * sign_slide * 4.5

				if stuck_timer > 1.8:
					# Reposition behind player if stuck for too long
					reposition_tactically(player)
					stuck_timer = 0.0
		else:
			stuck_timer = maxf(0.0, stuck_timer - delta * 2.0)

		velocity.x = lerpf(velocity.x, target_vel.x, acceleration * delta)
		velocity.z = lerpf(velocity.z, target_vel.z, acceleration * delta)
	else:
		velocity.x = 0.0
		velocity.z = 0.0

	# Gravity
	if not is_on_floor():
		velocity.y -= 28.0 * delta
	else:
		velocity.y = 0.0

	move_and_slide()

func find_closest_platform_idx(pos: Vector3) -> int:
	var platforms = GameManager.crater_platforms
	if platforms.is_empty():
		return 0
	var best_idx = 0
	var min_dist = INF
	for i in range(platforms.size()):
		var d = Vector2(pos.x - platforms[i].x, pos.z - platforms[i].z).length()
		d += absf(pos.y - platforms[i].y) * 0.8
		if d < min_dist:
			min_dist = d
			best_idx = i
	return best_idx

func handle_crater_movement(delta: float, player: Node3D, _dist_to_player: float) -> void:
	var platforms = GameManager.crater_platforms
	if platforms.is_empty():
		var dir = (target_pos - global_position).normalized()
		velocity = dir * current_speed
		move_and_slide()
		return

	# 1. Platform leap in progress: parabolic trajectory between platforms
	if is_jumping_plat:
		jump_plat_progress += delta / jump_plat_duration
		var t = clampf(jump_plat_progress, 0.0, 1.0)
		global_position = jump_plat_from.lerp(jump_plat_to, t)
		var arc = sin(t * PI) * 2.8
		global_position.y += arc

		if jump_plat_progress >= 1.0:
			is_jumping_plat = false
			global_position = jump_plat_to
			velocity = Vector3.ZERO
		return

	# 2. Identify player's platform and Nextbot's current platform
	var player_plat_idx = find_closest_platform_idx(player.global_position)
	crater_plat_idx = find_closest_platform_idx(global_position)

	# 3. If on the same platform as player: charge directly across platform!
	if crater_plat_idx == player_plat_idx:
		var dir = (player.global_position - global_position)
		dir.y = 0.0
		if dir.length() > 0.15:
			dir = dir.normalized()
			var target_vel = dir * current_speed
			velocity.x = lerpf(velocity.x, target_vel.x, acceleration * delta)
			velocity.z = lerpf(velocity.z, target_vel.z, acceleration * delta)
		else:
			velocity.x = 0.0
			velocity.z = 0.0
		global_position.y = platforms[crater_plat_idx].y + 1.2
		move_and_slide()
		return

	# 4. Advance platform by platform along the 28 spiral platforms!
	var next_idx = crater_plat_idx + (1 if player_plat_idx > crater_plat_idx else -1)
	next_idx = clampi(next_idx, 0, platforms.size() - 1)
	var next_plat_pos = platforms[next_idx] + Vector3(0, 1.2, 0)

	var to_next = Vector2(next_plat_pos.x - global_position.x, next_plat_pos.z - global_position.z)
	var dist_2d = to_next.length()

	# If near edge to leap across to next platform: INITIATE PARKOUR LEAP!
	if dist_2d <= 5.8:
		is_jumping_plat = true
		jump_plat_progress = 0.0
		jump_plat_from = global_position
		jump_plat_to = next_plat_pos
		jump_plat_duration = clampf(dist_2d / (current_speed * 1.05), 0.5, 0.95)
		SoundManager.play_sfx("jump")
		return

	# Run towards the next platform edge along the current platform
	var dir = (next_plat_pos - global_position)
	dir.y = 0.0
	if dir.length() > 0.1:
		dir = dir.normalized()
		var target_vel = dir * current_speed
		velocity.x = lerpf(velocity.x, target_vel.x, acceleration * delta)
		velocity.z = lerpf(velocity.z, target_vel.z, acceleration * delta)
	else:
		velocity.x = 0.0
		velocity.z = 0.0

	global_position.y = platforms[crater_plat_idx].y + 1.2
	move_and_slide()

# =========================================================================
# 🧠 FAST BFS MAZE CORRIDOR PATHFINDING
# =========================================================================
func update_maze_waypoint(target_world: Vector3) -> void:
	# 1. Line-of-sight check: if Nextbot sees player directly, run straight!
	if has_line_of_sight(global_position, target_world):
		current_waypoint = target_world
		return

	# 2. Breadth-First Search on 22x22 grid
	var grid = get_maze_grid()
	if grid.is_empty():
		current_waypoint = target_world
		return

	var start_cell = world_to_grid(global_position)
	var goal_cell = world_to_grid(target_world)

	start_cell = get_nearest_corridor(grid, start_cell)
	goal_cell = get_nearest_corridor(grid, goal_cell)

	if start_cell == goal_cell:
		current_waypoint = target_world
		return

	var rows = grid.size()
	var cols = grid[0].size()
	var queue: Array = []
	var visited = {}

	queue.append({ "r": start_cell.y, "c": start_cell.x, "first": null })
	visited[Vector2i(start_cell.x, start_cell.y)] = true

	var dirs = [
		Vector2i(0, -1),
		Vector2i(0, 1),
		Vector2i(-1, 0),
		Vector2i(1, 0)
	]

	var found_first: Variant = null

	while not queue.is_empty():
		var curr = queue.pop_front()
		if curr["r"] == goal_cell.y and curr["c"] == goal_cell.x:
			found_first = curr["first"]
			break

		for d in dirs:
			var nr = curr["r"] + d.y
			var nc = curr["c"] + d.x
			var v_key = Vector2i(nc, nr)

			if nr >= 0 and nr < rows and nc >= 0 and nc < cols:
				if grid[nr][nc] == 0 and not visited.has(v_key):
					visited[v_key] = true
					var next_first = curr["first"] if curr["first"] != null else Vector2i(nc, nr)
					queue.append({ "r": nr, "c": nc, "first": next_first })

	if found_first != null:
		current_waypoint = grid_to_world(found_first.y, found_first.x)
	else:
		current_waypoint = target_world

func has_line_of_sight(from_pos: Vector3, to_pos: Vector3) -> bool:
	var space_state = get_world_3d().direct_space_state
	var ray_params = PhysicsRayQueryParameters3D.new()
	ray_params.from = from_pos + Vector3(0, 1.0, 0)
	ray_params.to = to_pos + Vector3(0, 1.0, 0)
	ray_params.exclude = [self]
	var player = GameManager.player_node
	if player:
		ray_params.exclude.append(player)

	var result = space_state.intersect_ray(ray_params)
	return result.is_empty()

func get_maze_grid() -> Array:
	var maze_node = get_tree().current_scene
	if maze_node and "GRID" in maze_node:
		return maze_node.GRID
	return []

func world_to_grid(world_pos: Vector3) -> Vector2i:
	var tile_size = 4.0
	var offset = -44.0 # -(22 * 4.0) / 2.0
	var c = int(floor((world_pos.x - offset) / tile_size))
	var r = int(floor((world_pos.z - offset) / tile_size))
	return Vector2i(clampi(c, 0, 21), clampi(r, 0, 21))

func grid_to_world(r: int, c: int) -> Vector3:
	var tile_size = 4.0
	var offset = -44.0
	var x = offset + c * tile_size + tile_size / 2.0
	var z = offset + r * tile_size + tile_size / 2.0
	return Vector3(x, global_position.y, z)

func get_nearest_corridor(grid: Array, cell: Vector2i) -> Vector2i:
	var rows = grid.size()
	var cols = grid[0].size()
	if cell.y >= 0 and cell.y < rows and cell.x >= 0 and cell.x < cols:
		if grid[cell.y][cell.x] == 0:
			return cell

	var best_dist = 999.0
	var best_cell = cell
	for r in range(maxi(0, cell.y - 2), mini(rows, cell.y + 3)):
		for c in range(maxi(0, cell.x - 2), mini(cols, cell.x + 3)):
			if grid[r][c] == 0:
				var d = Vector2(c - cell.x, r - cell.y).length()
				if d < best_dist:
					best_dist = d
					best_cell = Vector2i(c, r)
	return best_cell

func reposition_tactically(player: Node3D) -> void:
	var p_cell = world_to_grid(player.global_position)
	var spawn_r = clampi(p_cell.y + (3 if randf() > 0.5 else -3), 1, 20)
	var spawn_c = clampi(p_cell.x + (3 if randf() > 0.5 else -3), 1, 20)
	var grid = get_maze_grid()
	var valid_cell = get_nearest_corridor(grid, Vector2i(spawn_c, spawn_r))
	global_position = grid_to_world(valid_cell.y, valid_cell.x)
	velocity = Vector3.ZERO
	stunned_timer = 0.5

func catch_player() -> void:
	if GameManager.shield_active:
		repel(24.0)
	else:
		GameManager.trigger_game_over(
			"ТЫ ПОТЕРЯЛ ДЕВСТВЕННОСТЬ",
			"Девушка Nextbot настигла тебя в темноте... Девственность утеряна навсегда."
		)

func repel(dist: float = 24.0) -> void:
	var player = GameManager.player_node
	if not player or not is_instance_valid(player):
		return
	var repel_dir = (global_position - player.global_position).normalized()
	repel_dir.y = 0.25
	velocity = repel_dir * dist
	stunned_timer = 1.3
	SoundManager.play_sfx("shield_blast")

func distract(decoy_pos: Vector3, duration: float = 5.0) -> void:
	target_pos = decoy_pos
	distracted_timer = duration

func _on_body_entered(body: Node) -> void:
	if body == GameManager.player_node and stunned_timer <= 0.0:
		catch_player()
