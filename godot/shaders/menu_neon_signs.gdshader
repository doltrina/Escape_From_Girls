shader_type canvas_item;

uniform sampler2D mask_texture_1 : hint_default_black, filter_linear; // R: Danger TL, G: Kanji L, B: Danger ML, A: Exit Mid
uniform sampler2D mask_texture_2 : hint_default_black, filter_linear; // R: Kanji TR, G: Exit TR, B: Warning Far/Mid, A: Panel LEDs

uniform vec4 sign_intensities_1 = vec4(1.0, 1.0, 1.0, 1.0);
uniform vec4 sign_intensities_2 = vec4(1.0, 1.0, 1.0, 1.0);

uniform float global_flicker = 1.0;
uniform float vignette_strength : hint_range(0.0, 0.6) = 0.15;

vec3 get_sign_delta(vec3 base_col, vec3 unlit_col, float mask_val, float intensity) {
	if (mask_val < 0.005) {
		return vec3(0.0);
	}
	float eff_intensity = intensity * global_flicker;
	vec3 target;
	if (eff_intensity < 1.0) {
		target = mix(unlit_col, base_col, clamp(eff_intensity, 0.0, 1.0));
	} else {
		target = base_col + base_col * (eff_intensity - 1.0) * 1.6;
	}
	return (target - base_col) * mask_val;
}

void fragment() {
	vec2 uv = UV;
	vec4 base_col = texture(TEXTURE, uv);
	vec4 m1 = texture(mask_texture_1, uv);
	vec4 m2 = texture(mask_texture_2, uv);

	// Compute realistic unlit dark glass tube & cold metallic backing
	float luma = dot(base_col.rgb, vec3(0.299, 0.587, 0.114));
	vec3 unlit_col = vec3(luma) * 0.12 + base_col.rgb * 0.04;

	vec3 delta = vec3(0.0);

	// Mask 1 signs:
	delta += get_sign_delta(base_col.rgb, unlit_col, m1.r, sign_intensities_1.r); // Danger TL
	delta += get_sign_delta(base_col.rgb, unlit_col, m1.g, sign_intensities_1.g); // Kanji Left
	delta += get_sign_delta(base_col.rgb, unlit_col, m1.b, sign_intensities_1.b); // Danger ML
	delta += get_sign_delta(base_col.rgb, unlit_col, m1.a, sign_intensities_1.a); // Exit Mid Red

	// Mask 2 signs:
	delta += get_sign_delta(base_col.rgb, unlit_col, m2.r, sign_intensities_2.r); // Kanji TR
	delta += get_sign_delta(base_col.rgb, unlit_col, m2.g, sign_intensities_2.g); // Exit TR
	delta += get_sign_delta(base_col.rgb, unlit_col, m2.b, sign_intensities_2.b); // Warning Far & Kanji MR
	delta += get_sign_delta(base_col.rgb, unlit_col, m2.a, sign_intensities_2.a); // Panel LEDs

	vec3 final_rgb = clamp(base_col.rgb + delta, 0.0, 2.5);

	// Subtle cinematic vignette
	if (vignette_strength > 0.0) {
		float vig = uv.x * (1.0 - uv.x) * uv.y * (1.0 - uv.y) * 16.0;
		vig = clamp(pow(vig, 0.25), 0.0, 1.0);
		final_rgb *= mix(1.0 - vignette_strength, 1.0, vig);
	}

	COLOR = vec4(final_rgb, base_col.a) * COLOR;
}
