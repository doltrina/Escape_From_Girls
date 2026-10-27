extends Node

signal heartbeat_beat(intensity: float)

var sfx_streams: Dictionary = {}
var chase_player: AudioStreamPlayer = null
var menu_ambience_player: AudioStreamPlayer = null
var menu_city_player: AudioStreamPlayer = null
var heartbeat_timer: float = 0.0
var current_chase_distance: float = 999.0
var max_chase_distance: float = 38.0
var master_volume: float = 0.95

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	generate_procedural_sfx()
	setup_chase_music()
	setup_menu_ambience()
	if GameManager.has_signal("state_changed"):
		GameManager.state_changed.connect(_on_game_state_changed)
	if GameManager.current_state == GameManager.GameState.MENU:
		start_menu_ambience()

func generate_procedural_sfx() -> void:
	sfx_streams["footstep"] = make_wav(0.08, func(t):
		var env = exp(-t * 60.0)
		var noise = (randf() * 2.0 - 1.0) * 0.4
		var low = sin(t * 180.0 * TAU) * 0.6
		return (noise + low) * env * 0.5
	)

	# Realistic punchy Lub-Dub heartbeat with audible mid-bass overtones
	sfx_streams["heartbeat"] = make_wav(0.45, func(t):
		# Lub (S1) at t=0.04s, Dub (S2) at t=0.18s
		var env1 = exp(-pow((t - 0.04) * 28.0, 2.0))
		var env2 = exp(-pow((t - 0.18) * 32.0, 2.0)) * 0.8
		# Pitch drop from 110Hz to 48Hz for Lub, 130Hz to 60Hz for Dub
		var f1 = 110.0 - clampf(t * 300.0, 0.0, 62.0)
		var f2 = 135.0 - clampf((t - 0.14) * 350.0, 0.0, 70.0)
		var s1 = (sin(t * f1 * TAU) + sin(t * f1 * 2.0 * TAU) * 0.5) * env1
		var s2 = (sin(t * f2 * TAU) + sin(t * f2 * 2.0 * TAU) * 0.4) * env2
		return clampf((s1 + s2) * 1.4, -1.0, 1.0)
	)

	sfx_streams["pickup"] = make_wav(0.25, func(t):
		var env = exp(-t * 14.0)
		var f = 587.33 if t < 0.12 else 880.0 # D5 -> A5
		return sin(t * f * TAU) * env * 0.5
	)

	sfx_streams["drink"] = make_wav(0.5, func(t):
		var env = exp(-t * 8.0)
		var hiss = (randf() * 2.0 - 1.0) * 0.4 * exp(-t * 20.0)
		var gulp = sin(t * (240.0 + sin(t * 30.0) * 80.0) * TAU) * 0.5
		return (hiss + gulp) * env * 0.6
	)

	sfx_streams["shield_blast"] = make_wav(0.75, func(t):
		var env = exp(-t * 6.0)
		var sweep = sin(t * (800.0 - t * 750.0) * TAU) * 0.5
		var rumble = (randf() * 2.0 - 1.0) * 0.5
		return (sweep + rumble) * env * 0.8
	)

	sfx_streams["key_pickup"] = make_wav(0.65, func(t):
		var env = exp(-t * 5.0)
		var step = int(t * 12.0)
		var freqs = [523.25, 659.25, 783.99, 1046.50] # C5, E5, G5, C6
		var f = freqs[mini(step, 3)]
		return (sin(t * f * TAU) + sin(t * f * 2.0 * TAU) * 0.3) * env * 0.6
	)

	sfx_streams["door_locked"] = make_wav(0.3, func(t):
		var env = exp(-t * 12.0)
		var buzzer = 0.6 if sin(t * 120.0 * TAU) > 0.0 else -0.6
		return buzzer * env * 0.5
	)

	sfx_streams["door_open"] = make_wav(1.1, func(t):
		var env = exp(-t * 3.5)
		var slide = sin(t * (180.0 + t * 90.0) * TAU) * 0.4
		var grind = (randf() * 2.0 - 1.0) * 0.3
		return (slide + grind) * env * 0.7
	)

	sfx_streams["jump"] = make_wav(0.2, func(t):
		var env = exp(-t * 15.0)
		var f = 150.0 + t * 300.0
		return sin(t * f * TAU) * env * 0.5
	)

	sfx_streams["double_jump"] = make_wav(0.3, func(t):
		var env = exp(-t * 12.0)
		var f = 350.0 + t * 450.0
		return sin(t * f * TAU) * env * 0.55
	)

	sfx_streams["land"] = make_wav(0.18, func(t):
		var env = exp(-t * 22.0)
		var thud = sin(t * 90.0 * TAU) * 0.7
		var noise = (randf() * 2.0 - 1.0) * 0.3
		return (thud + noise) * env * 0.6
	)

	sfx_streams["flashlight"] = make_wav(0.06, func(t):
		var env = exp(-t * 80.0)
		var click = sin(t * 1600.0 * TAU) * 0.6 + (randf() * 2.0 - 1.0) * 0.4
		return click * env * 0.5
	)

	sfx_streams["d20_save"] = make_wav(0.8, func(t):
		var env = exp(-t * 4.0)
		var f1 = sin(t * 440.0 * TAU)
		var f2 = sin(t * 880.0 * TAU) * 0.5
		var chime = sin(t * 1760.0 * TAU) * 0.3
		return (f1 + f2 + chime) * env * 0.7
	)

	sfx_streams["magma_death"] = make_wav(0.9, func(t):
		var env = exp(-t * 4.0)
		var sizzle = (randf() * 2.0 - 1.0) * 0.7
		var low = sin(t * 80.0 * TAU) * 0.5
		return (sizzle + low) * env * 0.75
	)

	sfx_streams["game_over"] = make_wav(1.4, func(t):
		# Original browser game playGameOver():
		# Sine sweep from 440 Hz exponentially down to 80 Hz over 0.95s
		var progress = clampf(t / 0.95, 0.0, 1.0)
		var freq = 440.0 * pow(80.0 / 440.0, progress)
		# Phase integration for smooth exponential sweep: integral(f0 * a^x dx)
		var log_a = log(80.0 / 440.0)
		var phase = (440.0 * (pow(80.0 / 440.0, progress) - 1.0) / log_a) * 0.95
		var env = pow(0.001 / 0.7, progress) if progress < 1.0 else 0.0
		var tone = sin(phase * TAU) * 0.7
		# Sub-bass impact
		var sub = sin(t * 55.0 * TAU) * exp(-t * 2.5) * 0.5
		# Menacing dissonant harmonic
		var diss = sin(phase * 1.414 * TAU) * 0.25 * env
		return (tone + sub + diss) * env
	)

	sfx_streams["glass_shatter"] = make_wav(0.8, func(t):
		var env = exp(-t * 8.0)
		var crack = (randf() * 2.0 - 1.0) * env * 0.8
		var glass_ping1 = sin(t * 2800.0 * TAU) * exp(-t * 12.0) * 0.4
		var glass_ping2 = sin(t * 4200.0 * TAU) * exp(-t * 16.0) * 0.3
		var punch = sin(t * 90.0 * TAU) * exp(-t * 22.0) * 0.9
		return (crack + glass_ping1 + glass_ping2 + punch) * 0.8
	)

	sfx_streams["victory"] = make_wav(2.0, func(t):
		var env = exp(-t * 1.5)
		var step = int(t * 4.0)
		var freqs = [392.0, 523.25, 659.25, 783.99, 1046.50] # G4, C5, E5, G5, C6
		var f = freqs[mini(step, 4)]
		var trumpet = sin(t * f * TAU) + sin(t * f * 2.0 * TAU) * 0.4 + sin(t * f * 3.0 * TAU) * 0.2
		return trumpet * env * 0.75
	)

	# Atmospheric neon electric sounds
	sfx_streams["neon_flicker"] = make_wav(0.20, func(t):
		var env = exp(-t * 15.0)
		var buzz = sin(t * 120.0 * TAU) * 0.4 + sin(t * 240.0 * TAU) * 0.25
		var crackle = (randf() * 2.0 - 1.0) * 0.55 if randf() > 0.4 else 0.0
		return (buzz + crackle) * env * 0.4
	)

	sfx_streams["neon_spark"] = make_wav(0.14, func(t):
		var env = exp(-t * 35.0)
		var snap = (randf() * 2.0 - 1.0) * 0.75
		var ping = sin(t * 2800.0 * TAU) * 0.35
		return (snap + ping) * env * 0.35
	)

	sfx_streams["neon_restart"] = make_wav(0.32, func(t):
		var click = sin(t * 1400.0 * TAU) * exp(-t * 80.0) * 0.6
		var hum = sin(t * 110.0 * TAU) * clampf(t * 5.0, 0.0, 1.0) * exp(-t * 4.5) * 0.35
		return (click + hum) * 0.4
	)

	# Soft cyberpunk UI feedback (procedural, no sample assets needed)
	sfx_streams["ui_hover"] = make_wav(0.085, func(t):
		var env = exp(-t * 42.0)
		var f = 1046.5 + t * 1900.0
		var tone = sin(t * f * TAU) * 0.30
		var shimmer = sin(t * f * 2.01 * TAU) * 0.11
		var air = (randf() * 2.0 - 1.0) * exp(-t * 120.0) * 0.12
		return (tone + shimmer + air) * env * 0.6
	)

	sfx_streams["ui_click"] = make_wav(0.16, func(t):
		var env = exp(-t * 26.0)
		var f = 620.0 - t * 1450.0
		var thump = sin(t * f * TAU) * 0.42
		var snap = (randf() * 2.0 - 1.0) * exp(-t * 110.0) * 0.4
		var air = sin(t * 2349.3 * TAU) * exp(-t * 60.0) * 0.16
		return (thump + snap + air) * env * 0.8
	)

	sfx_streams["ui_confirm"] = make_wav(0.42, func(t):
		var env = exp(-t * 7.0)
		var step = int(t * 20.0)
		var freqs = [523.25, 659.25, 783.99, 1046.50] # C5, E5, G5, C6
		var f = freqs[mini(step, 3)]
		var tone = sin(t * f * TAU) * 0.32 + sin(t * f * 2.0 * TAU) * 0.12
		var sub = sin(t * 110.0 * TAU) * exp(-t * 12.0) * 0.28
		return (tone + sub) * env * 0.75
	)

func make_wav(duration: float, generator: Callable) -> AudioStreamWAV:
	var wav = AudioStreamWAV.new()
	var sample_rate: int = 44100
	var num_samples: int = int(duration * sample_rate)
	var data = PackedByteArray()
	data.resize(num_samples * 2)

	for i in range(num_samples):
		var t = float(i) / float(sample_rate)
		var sample = clampf(generator.call(t), -1.0, 1.0)
		var int_val = int(sample * 32767.0)
		data.encode_s16(i * 2, int_val)

	wav.format = AudioStreamWAV.FORMAT_16_BITS
	wav.mix_rate = sample_rate
	wav.stereo = false
	wav.data = data
	return wav

func play_sfx(sfx_name: String, vol_offset_db: float = 0.0) -> void:
	if not sfx_streams.has(sfx_name):
		return
	var player = AudioStreamPlayer.new()
	player.stream = sfx_streams[sfx_name]
	player.volume_db = linear_to_db(master_volume) + vol_offset_db
	add_child(player)
	player.play()
	player.finished.connect(func():
		player.queue_free()
	)

func play_ui_hover() -> void:
	play_sfx("ui_hover", -19.0)

func play_ui_click() -> void:
	play_sfx("ui_click", -9.0)

func play_ui_confirm() -> void:
	play_sfx("ui_confirm", -7.0)

func setup_menu_ambience() -> void:
	menu_ambience_player = AudioStreamPlayer.new()
	var factory_stream = load("res://assets/audio/factory_ambience.ogg")
	if factory_stream:
		if factory_stream is AudioStreamOggVorbis:
			(factory_stream as AudioStreamOggVorbis).loop = true
		menu_ambience_player.stream = factory_stream
		menu_ambience_player.volume_db = -11.0
		add_child(menu_ambience_player)

	menu_city_player = AudioStreamPlayer.new()
	var city_stream = load("res://assets/audio/cyber_city_ambience.ogg")
	if city_stream:
		if city_stream is AudioStreamOggVorbis:
			(city_stream as AudioStreamOggVorbis).loop = true
		menu_city_player.stream = city_stream
		menu_city_player.volume_db = -16.0
		add_child(menu_city_player)

func start_menu_ambience() -> void:
	if menu_ambience_player:
		menu_ambience_player.volume_db = -11.0
		if not menu_ambience_player.playing:
			menu_ambience_player.play()
	if menu_city_player:
		menu_city_player.volume_db = -16.0
		if not menu_city_player.playing:
			menu_city_player.play()

func stop_menu_ambience() -> void:
	if menu_ambience_player and menu_ambience_player.playing:
		var tw = create_tween()
		tw.tween_property(menu_ambience_player, "volume_db", -80.0, 0.75)
		tw.tween_callback(menu_ambience_player.stop)
	if menu_city_player and menu_city_player.playing:
		var tw2 = create_tween()
		tw2.tween_property(menu_city_player, "volume_db", -80.0, 0.75)
		tw2.tween_callback(menu_city_player.stop)

func _on_game_state_changed(new_state: GameManager.GameState) -> void:
	if new_state == GameManager.GameState.MENU:
		start_menu_ambience()
	else:
		stop_menu_ambience()

func setup_chase_music() -> void:
	chase_player = AudioStreamPlayer.new()
	var music_stream = load("res://assets/audio/girl_music.mp3")
	if music_stream:
		chase_player.stream = music_stream
	else:
		# Fallback procedural synth music loop
		chase_player.stream = make_chase_bass_loop()
	chase_player.volume_db = -80.0 # Start muted
	add_child(chase_player)

func make_chase_bass_loop() -> AudioStreamWAV:
	var duration: float = 3.478 # 8 beats at 138 BPM
	var wav = AudioStreamWAV.new()
	var sample_rate: int = 44100
	var num_samples: int = int(duration * sample_rate)
	var data = PackedByteArray()
	data.resize(num_samples * 2)
	var bassline = [41.2, 41.2, 49.0, 41.2, 55.0, 41.2, 49.0, 46.25]
	var beat_len = duration / 8.0

	for i in range(num_samples):
		var t = float(i) / float(sample_rate)
		var beat_idx = int(t / beat_len) % 8
		var beat_t = fmod(t, beat_len)
		var f = bassline[beat_idx] * 2.0
		var env = exp(-beat_t * 9.0)
		var s = (sin(beat_t * f * TAU) + sin(beat_t * f * 2.0 * TAU) * 0.4) * env * 0.6
		if beat_idx % 2 == 1 and beat_t < 0.05:
			s += (randf() * 2.0 - 1.0) * exp(-beat_t * 60.0) * 0.2
		var val = int(clampf(s, -1.0, 1.0) * 32767.0)
		data.encode_s16(i * 2, val)

	wav.format = AudioStreamWAV.FORMAT_16_BITS
	wav.mix_rate = sample_rate
	wav.stereo = false
	wav.loop_mode = AudioStreamWAV.LOOP_FORWARD
	wav.loop_begin = 0
	wav.loop_end = num_samples
	wav.data = data
	return wav

func _process(delta: float) -> void:
	if GameManager.current_state != GameManager.GameState.PLAYING:
		if chase_player and chase_player.playing:
			chase_player.volume_db = -80.0
		return

	# Update chase music volume based on distance
	if chase_player:
		if not chase_player.playing:
			chase_player.play()

		var prox = clampf(1.0 - (current_chase_distance / max_chase_distance), 0.0, 1.0)
		var curve = pow(prox, 1.35)

		if prox <= 0.01:
			chase_player.volume_db = -80.0
		else:
			var target_db = linear_to_db(curve * master_volume)
			chase_player.volume_db = lerpf(chase_player.volume_db, target_db, delta * 8.0)

		# Accelerating visceral heartbeat
		if prox > 0.05:
			heartbeat_timer += delta
			var interval = lerpf(1.15, 0.33, prox)
			if heartbeat_timer >= interval:
				heartbeat_timer = 0.0
				play_heartbeat_sfx(prox)
				heartbeat_beat.emit(prox)
		else:
			heartbeat_timer = 0.0

func play_heartbeat_sfx(prox: float) -> void:
	if not sfx_streams.has("heartbeat"):
		return
	var player = AudioStreamPlayer.new()
	player.stream = sfx_streams["heartbeat"]
	var vol_linear = (0.6 + pow(prox, 1.1) * 1.0) * master_volume * 1.4
	player.volume_db = linear_to_db(vol_linear)
	add_child(player)
	player.play()
	player.finished.connect(func():
		player.queue_free()
	)

func update_nextbot_distance(distance: float) -> void:
	current_chase_distance = distance

func stop_chase_music() -> void:
	if chase_player:
		chase_player.stop()
	current_chase_distance = 999.0
