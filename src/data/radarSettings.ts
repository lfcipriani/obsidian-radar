/**
 * Radar Settings
 * Normalization and validation of the free-form `settings` object in radar files.
 *
 * The file format only guarantees a key-value object of string/boolean/number.
 * Known keys are validated here; invalid values are ignored (defaults apply) but
 * left untouched in the file, so data written by other clients is never lost.
 */

import type { DisplaySettings, RadarSettings, RadarSettingValue, TitleMode } from "../types";
import { DEFAULT_DISPLAY_SETTINGS } from "../constants";

const TITLE_MODES: readonly TitleMode[] = ["hide", "full", "crop"];

function isSettingValue(value: unknown): value is RadarSettingValue {
	return (
		typeof value === "string" ||
		typeof value === "boolean" ||
		(typeof value === "number" && Number.isFinite(value))
	);
}

/**
 * Keep only entries whose values are strings, booleans or finite numbers.
 * Returns undefined when the input isn't an object or has no valid entries.
 */
export function normalizeSettings(raw: unknown): RadarSettings | undefined {
	if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return undefined;
	const settings: RadarSettings = {};
	for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
		if (isSettingValue(value)) settings[key] = value;
	}
	return Object.keys(settings).length > 0 ? settings : undefined;
}

function readBoolean(settings: RadarSettings | undefined, key: string, fallback: boolean): boolean {
	const value = settings?.[key];
	return typeof value === "boolean" ? value : fallback;
}

/**
 * Read the toolbar display toggles, falling back to defaults for any
 * missing or non-compliant value.
 */
export function readDisplaySettings(settings: RadarSettings | undefined): DisplaySettings {
	const blipName = settings?.showBlipName;
	return {
		showBlipName: TITLE_MODES.includes(blipName as TitleMode)
			? (blipName as TitleMode)
			: DEFAULT_DISPLAY_SETTINGS.showBlipName,
		showGlow: readBoolean(settings, "showGlow", DEFAULT_DISPLAY_SETTINGS.showGlow),
		showPriorityLevelLabels: readBoolean(
			settings,
			"showPriorityLevelLabels",
			DEFAULT_DISPLAY_SETTINGS.showPriorityLevelLabels
		),
		showBacklinks: readBoolean(settings, "showBacklinks", DEFAULT_DISPLAY_SETTINGS.showBacklinks),
	};
}
