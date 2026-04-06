/**
 * Radar Plugin Constants
 * Default values and configuration
 */

import type { PriorityLevel, Category, RadarPluginSettings, ViewState } from "./types";

/** View type identifier for the radar view */
export const VIEW_TYPE_RADAR = "radar-view";

/** File extension for radar files (without the dot) */
export const RADAR_FILE_EXTENSION = "radar";

/** Default priority levels */
export const DEFAULT_PRIORITIES: PriorityLevel[] = [
	{ id: "p1", name: "Critical", maxRadius: 0.25 },
	{ id: "p2", name: "High", maxRadius: 0.50 },
	{ id: "p3", name: "Medium", maxRadius: 0.75 },
	{ id: "p4", name: "Low", maxRadius: 1.0 },
];

/** Default categories (4 unnamed segments) */
export const DEFAULT_CATEGORIES: Category[] = [
	{ id: "c1", name: "", startAngle: 0 },
	{ id: "c2", name: "", startAngle: 90 },
	{ id: "c3", name: "", startAngle: 180 },
	{ id: "c4", name: "", startAngle: 270 },
];

/** Default plugin settings */
export const DEFAULT_SETTINGS: RadarPluginSettings = {
	defaultPriorityCount: 4,
	defaultCategoryCount: 4,
	blipRadius: 10,
};

const RADAR_VIEWBOX_PADDING = 300;
const RADAR_BASE_DIAMETER = 600;

/** SVG rendering constants */
export const SVG_CONFIG = {
	/** Extra space around the radar so blips can live far outside the rings */
	viewBoxPadding: RADAR_VIEWBOX_PADDING,
	/** ViewBox size (square) */
	viewBoxSize: RADAR_BASE_DIAMETER + RADAR_VIEWBOX_PADDING * 2,
	/** Center point (half of viewBoxSize) */
	center: (RADAR_BASE_DIAMETER + RADAR_VIEWBOX_PADDING * 2) / 2,
	/** Maximum radius for the radar (leaving margin for labels) */
	maxRadius: 280,
	/** Default zoom keeps the radar prominent while hiding most extra padding on load */
	defaultZoom:
		(RADAR_BASE_DIAMETER + RADAR_VIEWBOX_PADDING * 2) / RADAR_BASE_DIAMETER,
	/** Stroke dash array for priority rings */
	dashArray: "5,5",
	/** Minimum zoom level */
	minZoom: 0.5,
	/** Maximum zoom level */
	maxZoom: 4,
	/** Zoom step for buttons/scroll */
	zoomStep: 0.25,
};

/** Default view state */
export const DEFAULT_VIEW_STATE: ViewState = {
	zoom: SVG_CONFIG.defaultZoom,
	panX: 0,
	panY: 0,
};
