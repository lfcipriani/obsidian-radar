/**
 * Dynamic blip colors
 * Resolve a note blip's color from its note's frontmatter property or tags.
 *
 * Precedence: frontmatter property → tag → blip's own color → radar default.
 * A resolved color is written into `blip.color` so the radar file stays
 * portable: other clients just see a regular per-blip color.
 */

import { getAllTags, type CachedMetadata, type MetadataCache } from "obsidian";
import type { BlipColorSettings, RadarData } from "../types";
import { OBSIDIAN_NAMED_COLORS } from "../constants";

const HEX_COLOR = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * Parse a hex code (with or without "#", 3 or 6 digits) or an Obsidian color
 * name into a lowercase 6-digit hex string. Returns undefined when invalid.
 */
export function parseColorValue(value: unknown): string | undefined {
	if (typeof value !== "string") return undefined;
	const trimmed = value.trim().toLowerCase();

	const named = OBSIDIAN_NAMED_COLORS[trimmed];
	if (named) return named;

	const match = HEX_COLOR.exec(trimmed);
	if (!match?.[1]) return undefined;
	const digits = match[1];
	if (digits.length === 3) {
		return "#" + digits.split("").map((d) => d + d).join("");
	}
	return "#" + digits;
}

function colorFromProperty(cache: CachedMetadata, propertyName: string): string | undefined {
	const name = propertyName.trim();
	if (!name) return undefined;
	const value: unknown = cache.frontmatter?.[name];
	const values: unknown[] = Array.isArray(value) ? value : [value];
	for (const v of values) {
		const color = parseColorValue(v);
		if (color) return color;
	}
	return undefined;
}

function colorFromTags(cache: CachedMetadata): string | undefined {
	for (const tag of getAllTags(cache) ?? []) {
		const color = parseColorValue(tag.replace(/^#/, ""));
		if (color) return color;
	}
	return undefined;
}

/**
 * Resolve the dynamic color for a note, or undefined when no rule applies.
 */
export function resolveNoteColor(
	metadataCache: MetadataCache,
	notePath: string,
	settings: BlipColorSettings
): string | undefined {
	if (!settings.blipColorByProperty && !settings.blipColorByTag) return undefined;
	const cache = metadataCache.getCache(notePath);
	if (!cache) return undefined;

	if (settings.blipColorByProperty) {
		const color = colorFromProperty(cache, settings.blipColorByPropertyName);
		if (color) return color;
	}
	if (settings.blipColorByTag) {
		return colorFromTags(cache);
	}
	return undefined;
}

/**
 * Write dynamic colors into the radar's note blips.
 * Blips with no matching property or tag keep their current color.
 * @returns true when at least one blip color changed
 */
export function applyDynamicBlipColors(
	radar: RadarData,
	metadataCache: MetadataCache,
	settings: BlipColorSettings
): boolean {
	if (!settings.blipColorByProperty && !settings.blipColorByTag) return false;

	let changed = false;
	for (const blip of radar.blips) {
		if (blip.type !== "note" || !blip.notePath) continue;
		const color = resolveNoteColor(metadataCache, blip.notePath, settings);
		if (color && color !== blip.color) {
			blip.color = color;
			changed = true;
		}
	}
	return changed;
}
