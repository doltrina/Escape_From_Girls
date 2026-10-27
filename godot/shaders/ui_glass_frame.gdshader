shader_type canvas_item;

// Recolors the cyan HUD glass frame into the menu's crimson/magenta palette
// while keeping the original notched corners and wall details.

uniform vec4 frame_color : source_color = vec4(1.0, 0.12, 0.34, 1.0);
uniform vec4 hot_color : source_color = vec4(1.0, 0.62, 0.78, 1.0);
uniform vec4 core_color : source_color = vec4(0.045, 0.008, 0.065, 0.94);

void fragment() {
	vec4 tex = texture(TEXTURE, UV);
	float luminance = max(tex.r, max(tex.g, tex.b));
	float cyan = clamp((tex.g + tex.b) * 0.5 - tex.r * 0.9, 0.0, 1.0);
	float border_mask = smoothstep(0.12, 0.5, cyan);

	vec3 col = mix(core_color.rgb, frame_color.rgb, border_mask);
	float hot = smoothstep(0.82, 1.0, luminance) * border_mask;
	col = mix(col, hot_color.rgb, hot * 0.75);
	col += tex.rgb * 0.035 * (1.0 - border_mask);

	float alpha = tex.a * mix(core_color.a, 1.0, border_mask);
	// NOTE: fragment COLOR already contains texture * vertex color in Godot 4;
	// multiplying by it again would tint the recolored frame back to cyan.
	COLOR = vec4(col, alpha);
}
