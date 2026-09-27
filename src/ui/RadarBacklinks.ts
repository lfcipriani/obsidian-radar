/**
 * Radar Backlinks
 * Renders dashed lines between blips whose notes link to each other
 */

import { SVG_CONFIG } from "../constants";
import type { BlipLink } from "../utils/backlinks";
import { createGroup, createSvgElement } from "../utils/svgHelpers";

interface Point {
	x: number;
	y: number;
}

export class RadarBacklinks {
	/** How far the curve bows out from a straight line, as a fraction of its length */
	private static readonly curvature = 0.10;

	private group: SVGGElement;
	private links: BlipLink[] = [];
	private positions = new Map<string, Point>();
	private blipRadius = 0;

	constructor() {
		// Same coordinate system as the blips group (origin at the radar center)
		this.group = createGroup("radar-backlinks", {
			transform: `translate(${SVG_CONFIG.center},${SVG_CONFIG.center})`,
		});
	}

	getElement(): SVGGElement {
		return this.group;
	}

	/**
	 * Replace the set of links and blip positions, then redraw all lines
	 */
	render(links: BlipLink[], positions: Map<string, Point>, blipRadius: number): void {
		this.links = links;
		this.positions = positions;
		this.blipRadius = blipRadius;
		this.group.innerHTML = "";

		for (const [fromId, toId] of this.links) {
			const line = createSvgElement("path", {
				class: "radar-backlink",
				"data-from": fromId,
				"data-to": toId,
			});
			this.group.appendChild(line);
			this.updateLine(line);
		}
	}

	/**
	 * Move the endpoints of every line attached to a blip (used while dragging)
	 */
	moveBlip(blipId: string, x: number, y: number): void {
		this.positions.set(blipId, { x, y });
		const lines = this.group.querySelectorAll<SVGPathElement>(
			`[data-from="${blipId}"], [data-to="${blipId}"]`
		);
		lines.forEach((line) => this.updateLine(line));
	}

	setVisible(visible: boolean): void {
		if (visible) {
			this.group.removeClass("radar-backlinks-hidden");
		} else {
			this.group.addClass("radar-backlinks-hidden");
		}
	}

	/**
	 * Draw a slightly curved line (quadratic Bézier) between its two blips,
	 * trimmed so it starts and ends at the edge of each dot instead of its center
	 */
	private updateLine(line: SVGPathElement): void {
		const from = this.positions.get(line.getAttribute("data-from") ?? "");
		const to = this.positions.get(line.getAttribute("data-to") ?? "");
		if (!from || !to) return;

		const dx = to.x - from.x;
		const dy = to.y - from.y;
		const length = Math.hypot(dx, dy);

		// Control point: offset from the midpoint along the perpendicular
		const bend = RadarBacklinks.curvature;
		const control = {
			x: (from.x + to.x) / 2 - dy * bend,
			y: (from.y + to.y) / 2 + dx * bend,
		};

		// A quadratic curve leaves each endpoint heading toward the control point,
		// so trimming along that direction lands on the dot's edge
		const canTrim = length > this.blipRadius * 2;
		const start = canTrim ? this.stepToward(from, control, this.blipRadius) : from;
		const end = canTrim ? this.stepToward(to, control, this.blipRadius) : to;

		line.setAttribute(
			"d",
			`M ${start.x},${start.y} Q ${control.x},${control.y} ${end.x},${end.y}`
		);
	}

	/**
	 * Move a point a fixed distance toward a target
	 */
	private stepToward(point: Point, target: Point, distance: number): Point {
		const dx = target.x - point.x;
		const dy = target.y - point.y;
		const length = Math.hypot(dx, dy);
		if (length === 0) return point;
		return {
			x: point.x + (dx / length) * distance,
			y: point.y + (dy / length) * distance,
		};
	}
}
