shader_type canvas_item;

uniform sampler2D noise_texture : hint_default_white, repeat_enable, filter_linear;

uniform vec4 smoke_color_purple : source_color = vec4(0.72, 0.22, 0.85, 1.0);
uniform vec4 smoke_color_blue   : source_color = vec4(0.24, 0.38, 0.75, 1.0);
uniform vec4 smoke_color_cyan   : source_color = vec4(0.18, 0.62, 0.78, 1.0);
uniform vec4 smoke_color_red    : source_color = vec4(0.85, 0.20, 0.35, 1.0);

uniform float purple_light : hint_range(0.0, 2.0) = 1.0;
uniform float cyan_light   : hint_range(0.0, 2.0) = 1.0;
uniform float red_light    : hint_range(0.0, 2.0) = 1.0;

uniform float smoke_density : hint_range(0.0, 1.5) = 0.65;
uniform float smoke_speed : hint_range(0.1, 3.0) = 1.0;

uniform vec2 corridor_center = vec2(0.50, 0.58);
uniform vec2 corridor_radius = vec2(0.36, 0.28);

void fragment() {
	vec2 uv = UV;

	// Elliptical falloff centered on corridor / girl silhouette
	vec2 d = (uv - corridor_center) / corridor_radius;
	float dist_sq = dot(d, d);
	float corridor_mask = exp(-dist_sq * 1.8);

	// Vertical ground bias: fog pools heavily near floor (y > 0.45) and dissipates upward
	float ground_bias = smoothstep(0.28, 0.75, uv.y);
	corridor_mask *= ground_bias;

	if (corridor_mask < 0.005) {
		COLOR = vec4(0.0);
	} else {
		float t = TIME * smoke_speed;

		// Layer 1: Slow sweeping mist
		vec2 uv1 = uv * vec2(1.2, 0.85) + vec2(t * 0.028, -t * 0.012);
		float n1 = texture(noise_texture, uv1).r;

		// Layer 2: Counter-drifting swirling eddies
		vec2 uv2 = uv * vec2(1.8, 1.3) + vec2(-t * 0.020, -t * 0.026);
		float n2 = texture(noise_texture, uv2).r;

		// Domain warping for turbulent organic curl curls
		vec2 warp = (vec2(n1, n2) - 0.5) * 0.12;
		vec2 uv3 = uv * vec2(2.5, 1.8) + warp + vec2(t * 0.012, -t * 0.018);
		float n3 = texture(noise_texture, uv3).r;

		// Combine noise octaves
		float raw_smoke = n1 * 0.45 + n2 * 0.35 + n3 * 0.20;
		float smoke = smoothstep(0.28, 0.82, raw_smoke);

		// Atmospheric coloring across corridor horizontal span
		// x < 0.45: left purple neon reflection
		// x 0.45..0.60: center atmospheric blue
		// x > 0.60: right cyan neon reflection
		float lx = clamp((uv.x - 0.32) / 0.38, 0.0, 1.0);
		vec3 smoke_col = mix(smoke_color_purple.rgb * purple_light, smoke_color_blue.rgb, lx);

		float rx = clamp((uv.x - 0.52) / 0.35, 0.0, 1.0);
		smoke_col = mix(smoke_col, smoke_color_cyan.rgb * cyan_light, rx);

		// Center-right subtle red back-lighting from red EXIT sign
		float red_factor = exp(-pow((uv.x - 0.58) / 0.12, 2.0)) * smoothstep(0.3, 0.6, uv.y);
		smoke_col = mix(smoke_col, smoke_color_red.rgb, red_factor * 0.35 * red_light);

		float final_alpha = smoke * corridor_mask * smoke_density;
		COLOR = vec4(smoke_col, final_alpha);
	}
}
