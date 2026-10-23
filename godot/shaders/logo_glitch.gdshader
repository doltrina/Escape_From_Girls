shader_type canvas_item;

uniform float glitch_intensity : hint_range(0.0, 1.0) = 0.0;
uniform float chromatic_split : hint_range(0.0, 0.04) = 0.006;
uniform float scanline_strength : hint_range(0.0, 0.5) = 0.12;

// Pseudo-random hash
float hash(vec2 p) {
	p = fract(p * vec2(123.34, 456.21));
	p += dot(p, p + 45.32);
	return fract(p.x * p.y);
}

void fragment() {
	vec2 uv = UV;

	// Intermittent horizontal slice displacement during glitch bursts
	if (glitch_intensity > 0.02) {
		float slice_y = floor(uv.y * 28.0);
		float slice_rand = hash(vec2(slice_y, floor(TIME * 22.0)));
		if (slice_rand > 0.62) {
			float shift = (hash(vec2(slice_y, floor(TIME * 30.0))) - 0.5) * 0.08 * glitch_intensity;
			uv.x = clamp(uv.x + shift, 0.0, 1.0);
		}
	}

	// Chromatic aberration (RGB split)
	float split = chromatic_split + glitch_intensity * 0.016;
	vec4 col_r = texture(TEXTURE, vec2(clamp(uv.x + split, 0.0, 1.0), uv.y));
	vec4 col_g = texture(TEXTURE, uv);
	vec4 col_b = texture(TEXTURE, vec2(clamp(uv.x - split, 0.0, 1.0), uv.y));

	float alpha = max(col_g.a, max(col_r.a, col_b.a));
	vec3 rgb = vec3(col_r.r, col_g.g, col_b.b);

	// Subtle futuristic CRT scanline lines
	if (scanline_strength > 0.01) {
		float scanline = sin(uv.y * 360.0) * 0.5 + 0.5;
		rgb = mix(rgb, rgb * (0.85 + scanline * 0.25), scanline_strength);
	}

	// Micro glitch flicker burst
	if (glitch_intensity > 0.15) {
		float flicker = hash(vec2(floor(TIME * 32.0), 0.0));
		rgb += vec3(0.08 * glitch_intensity * flicker);
	}

	COLOR = vec4(rgb, alpha) * COLOR;
}
