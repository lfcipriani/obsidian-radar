/**
 * Radar Backlinks
 * Renders dashed lines between blips whose notes link to each other
 */

import { SVG_CONFIG } from "../constants";
import type { BlipLink } from "../utils/backlinks";
import { generateId } from "../utils/idGenerator";
import { createGroup, createSvgElement, setAttributes } from "../utils/svgHelpers";

interface Point {
	x: number;
	y: number;
}

/** Where a blip sits and which color its backlink lines should use */
export interface BacklinkEndpoint extends Point {
	color: string;
}

export class RadarBacklinks {
	/** How far the curve bows out from a straight line, as a fraction of its length */
	private static readonly curvature = 0.10;

	private group: SVGGElement;
	private defs: SVGDefsElement;
	private links: BlipLink[] = [];
	private endpoints = new Map<string, BacklinkEndpoint>();
	private blipRadius = 0;
	/** Keeps gradient IDs unique when several radars are open at once */
	private idPrefix = `radar-backlink-${generateId()}`;

	constructor() {
		// Same coordinate system as the blips group (origin at the radar center)
		this.group = createGroup("radar-backlinks", {
			transform: `translate(${SVG_CONFIG.center},${SVG_CONFIG.center})`,
		});
		this.defs = createSvgElement("defs", {});
		this.group.appendChild(this.defs);
	}

	getElement(): SVGGElement {
		return this.group;
	}

	/**
	 * Replace the set of links and blip endpoints, then redraw all lines.
	 * Each line gets its own gradient, fading from the start blip's color
	 * into the end blip's color.
	 */
	render(links: BlipLink[], endpoints: Map<string, BacklinkEndpoint>, blipRadius: number): void {
		this.links = links;
		this.endpoints = endpoints;
		this.blipRadius = blipRadius;
		this.defs.innerHTML = "";
		this.group.querySelectorAll(".radar-backlink").forEach((el) => el.remove());

		this.links.forEach(([fromId, toId], index) => {
			const from = this.endpoints.get(fromId);
			const to = this.endpoints.get(toId);
			if (!from || !to) return;

			const gradientId = `${this.idPrefix}-${index}`;
			const gradient = createSvgElement("linearGradient", {
				id: gradientId,
				gradientUnits: "userSpaceOnUse",
			});
			gradient.appendChild(this.createStop("0%", from.color));
			gradient.appendChild(this.createStop("100%", to.color));
			this.defs.appendChild(gradient);

			const line = createSvgElement("path", {
				class: "radar-backlink",
				stroke: `url(#${gradientId})`,
				"data-from": fromId,
				"data-to": toId,
				"data-gradient": gradientId,
			});
			this.group.appendChild(line);
			this.updateLine(line);
		});
	}

	/**
	 * Move the endpoints of every line attached to a blip (used while dragging)
	 */
	moveBlip(blipId: string, x: number, y: number): void {
		const endpoint = this.endpoints.get(blipId);
		if (!endpoint) return;
		endpoint.x = x;
		endpoint.y = y;
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
		const from = this.endpoints.get(line.getAttribute("data-from") ?? "");
		const to = this.endpoints.get(line.getAttribute("data-to") ?? "");
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

		// Keep the gradient axis on the line so the fade follows the blips
		const gradient = this.defs.querySelector(`#${line.getAttribute("data-gradient") ?? ""}`);
		if (gradient) {
			setAttributes(gradient as SVGElement, { x1: start.x, y1: start.y, x2: end.x, y2: end.y });
		}
	}

	/**
	 * Create a gradient stop; color goes in style so CSS variables resolve
	 */
	private createStop(offset: string, color: string): SVGStopElement {
		const stop = createSvgElement("stop", { offset });
		stop.style.setProperty("stop-color", color);
		return stop;
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
