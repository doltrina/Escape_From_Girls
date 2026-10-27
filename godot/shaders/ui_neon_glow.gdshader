shader_type canvas_item;
render_mode blend_add, unshaded;

// Soft additive halo drawn behind a menu button. The ColorRect using this
// material is padded around the button, so UV space covers button + 2*padding.

uniform vec4 glow_color : source_color = vec4(1.0, 0.12, 0.32, 1.0);
uniform vec2 button_size = vec2(440.0, 78.0);
uniform float padding = 20.0;
uniform float corner_radius = 5.0;
uniform float glow_width = 22.0;
uniform float intensity : hint_range(0.0, 4.0) = 0.0;

float sd_rounded_box(vec2 p, vec2 half_size, float radius) {
	vec2 q = abs(p) - half_size + vec2(radius);
	return length(max(q, vec2(0.0))) + min(max(q.x, q.y), 0.0) - radius;
}

void fragment() {
	vec2 total = button_size + vec2(padding * 2.0);
	vec2 p = (UV - 0.5) * total;
	float d = sd_rounded_box(p, button_size * 0.5, corner_radius);

	// Exponential falloff outside the rounded rect, plus a faint bleed
	// just inside its edge so the glow feels attached to the frame.
	float falloff = max(glow_width * 0.32, 0.5);
	float halo = exp(-max(d, 0.0) / falloff);
	float inner = d < 0.0 ? smoothstep(-2.5, 0.0, d) * 0.42 : 1.0;
	float glow = halo * inner * max(intensity, 0.0);

	COLOR = vec4(glow_color.rgb * glow, 1.0);
}
