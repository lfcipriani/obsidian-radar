/**
 * Radar Plugin Types
 * Core interfaces for the radar data model
 */

/** Type of blip - either a linked note or standalone text */
export type BlipType = "note" | "text";

/** A blip represents an item on the radar */
export interface Blip {
	/** Unique identifier (UUID) */
	id: string;
	/** Type of blip */
	type: BlipType;
	/** Display title */
	title: string;
	/** Path to linked Obsidian note (only for type="note") */
	notePath?: string;
	/** Radial distance from center (0-1, normalized) */
	r: number;
	/** Angle in degrees (0-360, counterclockwise from positive x-axis) */
	theta: number;
	/** Optional custom color */
	color?: string;
}

/** A priority level defines a ring on the radar */
export interface PriorityLevel {
	/** Unique identifier */
	id: string;
	/** Display name (e.g., "Critical", "High") */
	name: string;
	/** Maximum radius for this level (0-1, normalized) */
	maxRadius: number;
}

/** A category defines a segment of the radar */
export interface Category {
	/** Unique identifier */
	id: string;
	/** Display name (can be empty for unnamed categories) */
	name: string;
	/** Starting angle in degrees */
	startAngle: number;
	/** Optional segment background color */
	color?: string;
}

/** View state for pan and zoom */
export interface ViewState {
	/** Zoom level (1 = default, 2 = 2x zoom) */
	zoom: number;
	/** Pan offset X */
	panX: number;
	/** Pan offset Y */
	panY: number;
}

/** Complete radar data structure stored in JSON files */
export interface RadarData {
	/** Priority levels (1-7 rings) */
	priorityLevels: PriorityLevel[];
	/** Categories (0-8 segments) */
	categories: Category[];
	/** Blips on the radar */
	blips: Blip[];
}

/** Plugin settings stored via Obsidian's data API */
export interface RadarPluginSettings {
	/** Default number of priority levels for new radars */
	defaultPriorityCount: number;
	/** Default number of categories for new radars */
	defaultCategoryCount: number;
	/** Blip circle radius in pixels */
	blipRadius: number;
}
