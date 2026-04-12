/**
 * Polar Coordinate Utilities
 * Convert between polar and Cartesian coordinates
 */

import type { PriorityLevel, Category, Blip } from "../types";

export interface CartesianPoint {
	x: number;
	y: number;
}

export interface PolarPoint {
	r: number;
	theta: number;
}

/**
 * Convert polar coordinates to Cartesian
 * @param r - Radial distance (normalized 0-1)
 * @param thetaDegrees - Angle in degrees (counterclockwise from positive x-axis)
 * @param maxRadius - Maximum radius in pixels
 * @returns Cartesian coordinates relative to center (0,0)
 */
export function polarToCartesian(
	r: number,
	thetaDegrees: number,
	maxRadius: number
): CartesianPoint {
	const thetaRadians = (thetaDegrees * Math.PI) / 180;
	const actualRadius = r * maxRadius;
	return {
		x: actualRadius * Math.cos(thetaRadians),
		// Negate y because SVG y-axis is inverted (positive downward)
		y: -actualRadius * Math.sin(thetaRadians),
	};
}

/**
 * Convert Cartesian coordinates to polar
 * @param x - X coordinate relative to center
 * @param y - Y coordinate relative to center (SVG coordinates, positive downward)
 * @param maxRadius - Maximum radius in pixels
 * @returns Polar coordinates (r may exceed 1 outside the radar rings, theta in degrees)
 */
export function cartesianToPolar(
	x: number,
	y: number,
	maxRadius: number
): PolarPoint {
	// Negate y to convert from SVG coordinates
	const r = Math.sqrt(x * x + y * y) / maxRadius;
	let theta = (Math.atan2(-y, x) * 180) / Math.PI;
	// Normalize angle to 0-360
	if (theta < 0) {
		theta += 360;
	}
	return { r, theta };
}

/**
 * Get the priority level for a given radial distance
 * @param r - Radial distance (normalized 0-1)
 * @param priorities - Array of priority levels
 * @returns The priority level or undefined if outside all levels
 */
export function getPriorityFromRadius(
	r: number,
	priorities: PriorityLevel[]
): PriorityLevel | undefined {
	// Sort by maxRadius ascending
	const sorted = [...priorities].sort((a, b) => a.maxRadius - b.maxRadius);
	for (const priority of sorted) {
		if (r <= priority.maxRadius) {
			return priority;
		}
	}
	return sorted[sorted.length - 1];
}

/**
 * Get the category for a given angle
 * @param theta - Angle in degrees (0-360)
 * @param categories - Array of categories
 * @returns The category or undefined if no categories
 */
export function getCategoryFromAngle(
	theta: number,
	categories: Category[]
): Category | undefined {
	if (categories.length === 0) {
		return undefined;
	}

	// Normalize angle to 0-360
	let normalizedTheta = theta % 360;
	if (normalizedTheta < 0) {
		normalizedTheta += 360;
	}

	// Sort by startAngle ascending
	const sorted = [...categories].sort((a, b) => a.startAngle - b.startAngle);

	// Find the category that contains this angle
	for (let i = sorted.length - 1; i >= 0; i--) {
		const category = sorted[i];
		if (category && normalizedTheta >= category.startAngle) {
			return category;
		}
	}

	// If angle is less than first category's start, it belongs to the last category
	return sorted[sorted.length - 1] ?? categories[0];
}

/**
 * Reposition blips so they follow their priority ring after a reorder or resize.
 * Each blip's relative position within its old ring is preserved in the
 * corresponding new ring. Mutates blips in place.
 * If a priority was removed, its blips are left in place (r unchanged).
 */
export function repositionBlipsWithPriorities(
	blips: Blip[],
	oldPriorities: PriorityLevel[],
	newPriorities: PriorityLevel[]
): void {
	if (oldPriorities.length === 0 || newPriorities.length === 0) return;

	const oldSorted = [...oldPriorities].sort((a, b) => a.maxRadius - b.maxRadius);
	const newSorted = [...newPriorities].sort((a, b) => a.maxRadius - b.maxRadius);

	// Build map: id → { inner, outer } for new priorities
	const newBoundsById = new Map<string, { inner: number; outer: number }>();
	newSorted.forEach((p, i) => {
		newBoundsById.set(p.id, {
			inner: i === 0 ? 0 : newSorted[i - 1]!.maxRadius,
			outer: p.maxRadius,
		});
	});

	for (const blip of blips) {
		const oldPriority = getPriorityFromRadius(blip.r, oldSorted);
		if (!oldPriority) continue;

		const newBounds = newBoundsById.get(oldPriority.id);
		if (!newBounds) continue; // priority was removed; leave blip in place

		const oldIdx = oldSorted.findIndex((p) => p.id === oldPriority.id);
		const oldInner = oldIdx === 0 ? 0 : oldSorted[oldIdx - 1]!.maxRadius;
		const oldSpan = oldPriority.maxRadius - oldInner;

		const relativePos = oldSpan > 0 ? (blip.r - oldInner) / oldSpan : 0.5;
		const newSpan = newBounds.outer - newBounds.inner;
		blip.r = newBounds.inner + relativePos * newSpan;
	}
}

/**
 * Rotate blips so they follow their categories after a reorder or resize.
 * Each blip's relative position within its old category segment is preserved
 * in the corresponding new segment. Mutates blips in place.
 */
export function rotateBlipsWithCategories(
	blips: Blip[],
	oldCategories: Category[],
	newCategories: Category[]
): void {
	if (oldCategories.length === 0 || newCategories.length === 0) return;

	const oldStep = 360 / oldCategories.length;
	const newStep = 360 / newCategories.length;

	const newStartById = new Map<string, number>(
		newCategories.map((c) => [c.id, c.startAngle])
	);

	for (const blip of blips) {
		const oldCat = getCategoryFromAngle(blip.theta, oldCategories);
		if (!oldCat) continue;

		const newStart = newStartById.get(oldCat.id);
		if (newStart === undefined) continue; // category was removed; leave blip in place

		const relativeOffset = ((blip.theta - oldCat.startAngle + 360) % 360) / oldStep;
		blip.theta = (newStart + relativeOffset * newStep + 360) % 360;
	}
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}
