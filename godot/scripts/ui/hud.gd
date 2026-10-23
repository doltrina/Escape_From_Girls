extends Control

@onready var timer_label: Label = $TopBar/TimerPanel/Margin/TimerLabel
@onready var objective_label: Label = $TopBar/ObjectivePanel/Margin/ObjectiveLabel
@onready var keys_panel: PanelContainer = $TopBar/KeysPanel
@onready var keys_container: HBoxContainer = $TopBar/KeysPanel/Margin/KeysContainer
@onready var stamina_bar: ProgressBar = $BottomBar/StaminaBar
@onready var warning_label: Label = $WarningLabel
@onready var crosshair: Control = $Crosshair
@onready var heartbeat_vignette: ColorRect = $HeartbeatVignette

# Hotbar items
@onready var slot1_count: Label = $Hotbar/Slot1/Count
@onready var slot2_count: Label = $Hotbar/Slot2/Count
@onready var slot3_count: Label = $Hotbar/Slot3/Count
@onready var slot4_count: Label = $Hotbar/Slot4/Count
@onready var shield_indicator: Panel = $Hotbar/Slot1/ActiveIndicator
@onready var speed_indicator: Panel = $Hotbar/Slot2/ActiveIndicator

var key_icons: Array[TextureRect] = []

func _ready() -> void:
	set_mouse_filter_recursive(self)
	GameManager.state_changed.connect(_on_state_changed)
	GameManager.keys_updated.connect(_on_keys_updated)
	GameManager.inventory_updated.connect(_on_inventory_updated)
	GameManager.stamina_updated.connect(_on_stamina_updated)
	GameManager.shield_status_updated.connect(_on_shield_updated)
	GameManager.speed_boost_updated.connect(_on_speed_updated)
	if SoundManager.has_signal("heartbeat_beat"):
		SoundManager.heartbeat_beat.connect(_on_heartbeat_beat)

	# Cache key icons
	for child in keys_container.get_children():
		if child is TextureRect:
			key_icons.append(child)

	update_all_inventory()
	_on_keys_updated(GameManager.keys_collected, GameManager.total_keys)
	_on_state_changed(GameManager.current_state)

func _on_state_changed(new_state: GameManager.GameState) -> void:
	visible = (new_state != GameManager.GameState.CUTSCENE and new_state != GameManager.GameState.MENU)


func set_mouse_filter_recursive(node: Node) -> void:
	if node is Control and node.name != "PauseMenu" and not is_ancestor_of_or_equal(node, "PauseMenu"):
		node.mouse_filter = Control.MOUSE_FILTER_IGNORE
	for child in node.get_children():
		if child.name != "PauseMenu":
			set_mouse_filter_recursive(child)

func is_ancestor_of_or_equal(node: Node, target_name: String) -> bool:
	var curr: Node = node
	while curr:
		if curr.name == target_name:
			return true
		curr = curr.get_parent()
	return false

func _process(delta: float) -> void:
	if GameManager.current_state == GameManager.GameState.PLAYING:
		var total_sec = GameManager.elapsed_time
		var mins = int(total_sec / 60.0)
		var secs = int(fmod(total_sec, 60.0))
		var tenths = int(fmod(total_sec * 10.0, 10.0))
		timer_label.text = "%02d:%02d.%d" % [mins, secs, tenths]

		# Proximity threat warning
		var dist = SoundManager.current_chase_distance
		if dist < 12.0:
			warning_label.visible = true
			warning_label.text = "⚠️ ОНА ОЧЕНЬ БЛИЗКО! БЕГИ! ⚠️"
			warning_label.modulate = Color(1.0, 0.1, 0.2, 0.7 + sin(Time.get_ticks_msec() * 0.01) * 0.3)
		elif dist < 24.0:
			warning_label.visible = true
			warning_label.text = "⚠️ ДЕВУШКА НАСТИГАЕТ... ⚠️"
			warning_label.modulate = Color(1.0, 0.6, 0.1, 0.8)
		else:
			warning_label.visible = false

func _on_keys_updated(count: int, total: int) -> void:
	if GameManager.current_map == GameManager.MapType.MAZE:
		objective_label.text = "ЦЕЛЬ: НАЙДИ 3 КЛЮЧА И ВЫБЕРИСЬ ЧЕРЕЗ ВЫХОД (%d/%d)" % [count, total]
		if keys_panel: keys_panel.visible = true
		for i in range(key_icons.size()):
			if i < count:
				key_icons[i].modulate = Color(1, 0.85, 0.1, 1.0) # Bright gold
			else:
				key_icons[i].modulate = Color(0.3, 0.3, 0.3, 0.5) # Dim
	else:
		objective_label.text = "ЦЕЛЬ: ПОДНИМИСЬ НА ВЕРШИНУ КРАТЕРА И УЛЕТАЙ НА ВЕРТОЛЕТЕ!"
		if keys_panel: keys_panel.visible = false

func _on_inventory_updated(_item_id: String, _count: int) -> void:
	update_all_inventory()

func update_all_inventory() -> void:
	if slot1_count: slot1_count.text = str(GameManager.inventory.get("forcefield", 0))
	if slot2_count: slot2_count.text = str(GameManager.inventory.get("energy_drink", 0))
	if slot3_count: slot3_count.text = str(GameManager.inventory.get("dakimakura", 0))
	if slot4_count: slot4_count.text = str(GameManager.inventory.get("d20_dice", 0))

func _on_stamina_updated(current: float, max_val: float) -> void:
	stamina_bar.max_value = max_val
	stamina_bar.value = current

func _on_shield_updated(active: bool, _time_left: float) -> void:
	if shield_indicator:
		shield_indicator.visible = active

func _on_speed_updated(active: bool, _time_left: float) -> void:
	if speed_indicator:
		speed_indicator.visible = active

func _on_heartbeat_beat(intensity: float) -> void:
	if heartbeat_vignette:
		heartbeat_vignette.visible = true
		heartbeat_vignette.color = Color(0.9, 0.05, 0.15, clampf(intensity * 0.45, 0.15, 0.55))
		var tween = create_tween()
		tween.tween_property(heartbeat_vignette, "color:a", 0.0, 0.35)
		tween.tween_callback(func():
			if heartbeat_vignette and heartbeat_vignette.color.a <= 0.01:
				heartbeat_vignette.visible = false
		)
