extends CharacterBody3D

@export var walk_speed: float = 7.0
@export var sprint_speed: float = 12.8
@export var acceleration: float = 45.0
@export var friction: float = 10.0
@export var jump_force: float = 8.5
@export var gravity: float = 24.0
@export var mouse_sensitivity: float = 0.003

# Stamina
var max_stamina: float = 100.0
var stamina: float = 100.0
var stamina_drain: float = 26.0
var stamina_regen: float = 18.0
var is_exhausted: bool = false
var exhaustion_cooldown: float = 0.0

# Volcano Parkour & Double Jump
var can_double_jump: bool = false
var has_double_jumped: bool = false

# Head Bobbing & Steps
var bob_timer: float = 0.0
var step_timer: float = 0.0
var original_camera_y: float = 0.0

# Nodes
@onready var head: Node3D = $Head
@onready var camera: Camera3D = $Head/Camera3D
@onready var flashlight: SpotLight3D = $Head/Camera3D/Flashlight
@onready var shield_aura: MeshInstance3D = $ShieldAura

var camera_pitch: float = 0.0

func _ready() -> void:
	GameManager.player_node = self
	if GameManager.current_state != GameManager.GameState.CUTSCENE:
		GameManager.current_state = GameManager.GameState.PLAYING
		Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
	original_camera_y = camera.position.y
	if shield_aura:
		shield_aura.visible = false

func _input(event: InputEvent) -> void:
	if GameManager.current_state != GameManager.GameState.PLAYING:
		return

	# Re-capture mouse if player clicks anywhere in the window
	if event is InputEventMouseButton and event.pressed:
		Input.mouse_mode = Input.MOUSE_MODE_CAPTURED

	if event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		# Yaw (left / right) rotates body
		rotate_y(-event.relative.x * mouse_sensitivity)
		# Pitch (up / down) rotates camera
		camera_pitch = clampf(camera_pitch - event.relative.y * mouse_sensitivity, -deg_to_rad(88.0), deg_to_rad(88.0))
		head.rotation.x = camera_pitch

	if event.is_action_pressed("flashlight"):
		flashlight.visible = not flashlight.visible
		SoundManager.play_sfx("flashlight")

	if event.is_action_pressed("use_item_1"):
		GameManager.use_item("forcefield")
	elif event.is_action_pressed("use_item_2"):
		GameManager.use_item("energy_drink")
	elif event.is_action_pressed("use_item_3"):
		GameManager.use_item("dakimakura")
	elif event.is_action_pressed("use_item_4"):
		GameManager.use_item("d20_dice")

func _physics_process(delta: float) -> void:
	if GameManager.current_state != GameManager.GameState.PLAYING:
		return

	# Shield Visual Aura
	if shield_aura:
		shield_aura.visible = GameManager.shield_active

	# Gravity
	if not is_on_floor():
		velocity.y -= gravity * delta
	else:
		has_double_jumped = false

	# Jump & Double Jump
	if Input.is_action_just_pressed("jump"):
		if is_on_floor():
			velocity.y = jump_force
			SoundManager.play_sfx("jump")
		elif can_double_jump and not has_double_jumped:
			has_double_jumped = true
			velocity.y = jump_force * 0.95
			SoundManager.play_sfx("double_jump")

	# Stamina & Sprinting
	var is_sprinting = Input.is_action_pressed("sprint") and not is_exhausted and is_on_floor()
	var input_dir = Input.get_vector("move_left", "move_right", "move_forward", "move_backward")
	var is_moving = input_dir.length_squared() > 0.01

	if GameManager.speed_boost_active:
		is_sprinting = true
		stamina = max_stamina

	if is_sprinting and is_moving and not GameManager.speed_boost_active:
		stamina = maxf(0.0, stamina - stamina_drain * delta)
		if stamina <= 0.0:
			is_exhausted = true
			exhaustion_cooldown = 2.0
	elif not is_sprinting:
		if is_exhausted:
			exhaustion_cooldown -= delta
			if exhaustion_cooldown <= 0.0:
				is_exhausted = false
		stamina = minf(max_stamina, stamina + stamina_regen * delta)

	GameManager.stamina_updated.emit(stamina, max_stamina)

	# Movement Speed
	var target_speed = walk_speed
	if is_sprinting and is_moving:
		target_speed = sprint_speed * (1.3 if GameManager.speed_boost_active else 1.0)

	var move_dir = (transform.basis * Vector3(input_dir.x, 0, input_dir.y)).normalized()

	if move_dir:
		velocity.x = lerpf(velocity.x, move_dir.x * target_speed, acceleration * delta)
		velocity.z = lerpf(velocity.z, move_dir.z * target_speed, acceleration * delta)

		# Footsteps & Head Bobbing
		if is_on_floor():
			bob_timer += delta * (14.0 if is_sprinting else 9.0)
			camera.position.y = original_camera_y + sin(bob_timer) * 0.04
			camera.position.x = cos(bob_timer * 0.5) * 0.03

			step_timer += delta
			var step_interval = 0.28 if is_sprinting else 0.44
			if step_timer >= step_interval:
				step_timer = 0.0
				SoundManager.play_sfx("footstep")
	else:
		velocity.x = lerpf(velocity.x, 0.0, friction * delta)
		velocity.z = lerpf(velocity.z, 0.0, friction * delta)
		camera.position.y = lerpf(camera.position.y, original_camera_y, delta * 10.0)
		camera.position.x = lerpf(camera.position.x, 0.0, delta * 10.0)

	move_and_slide()

func restore_stamina() -> void:
	stamina = max_stamina
	is_exhausted = false
