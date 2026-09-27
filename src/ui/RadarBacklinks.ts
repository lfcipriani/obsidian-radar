/**
 * Radar Backlinks
 * Renders dashed lines between blips whose notes link to each other
 */

import { SVG_CONFIG } from "../constants";
import type { BlipLink } from "../utils/backlinks";
import { createGroup, createLine, setAttributes } from "../utils/svgHelpers";

interface Point {
	x: number;
	y: number;
}

export class RadarBacklinks {
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
			const line = createLine(0, 0, 0, 0, "radar-backlink", {
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
		const lines = this.group.querySelectorAll<SVGLineElement>(
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
	 * Position a line between its two blips, trimmed so it starts and ends
	 * at the edge of each dot instead of its center
	 */
	private updateLine(line: SVGLineElement): void {
		const from = this.positions.get(line.getAttribute("data-from") ?? "");
		const to = this.positions.get(line.getAttribute("data-to") ?? "");
		if (!from || !to) return;

		const dx = to.x - from.x;
		const dy = to.y - from.y;
		const length = Math.hypot(dx, dy);
		const trim = length > this.blipRadius * 2 ? this.blipRadius / length : 0;

		setAttributes(line, {
			x1: from.x + dx * trim,
			y1: from.y + dy * trim,
			x2: to.x - dx * trim,
			y2: to.y - dy * trim,
		});
	}
}
