/**
 * Radar Renderer
 * Handles SVG rendering of the radar visualization
 */

import type { RadarData, Blip } from "../types";
import { SVG_CONFIG } from "../constants";
import { polarToCartesian } from "../utils/polarCoordinates";
import {
	createSvgContainer,
	createCircle,
	createLine,
	createText,
	createGroup,
	setAttributes,
} from "../utils/svgHelpers";

export interface RadarRendererOptions {
	blipRadius: number;
	onBlipClick?: (blipId: string) => void;
}

export class RadarRenderer {
	private svg: SVGSVGElement;
	private backgroundGroup: SVGGElement;
	private categoryGroup: SVGGElement;
	private blipsGroup: SVGGElement;
	private radarData: RadarData;
	private options: RadarRendererOptions;

	constructor(
		private container: HTMLElement,
		radarData: RadarData,
		options: RadarRendererOptions
	) {
		this.radarData = radarData;
		this.options = options;

		// Create SVG structure
		this.svg = createSvgContainer(SVG_CONFIG.viewBoxSize, "radar-svg");
		this.backgroundGroup = createGroup("radar-background");
		this.categoryGroup = createGroup("radar-categories");
		this.blipsGroup = createGroup("radar-blips", {
			transform: `translate(${SVG_CONFIG.center},${SVG_CONFIG.center})`,
		});

		this.svg.appendChild(this.backgroundGroup);
		this.svg.appendChild(this.categoryGroup);
		this.svg.appendChild(this.blipsGroup);
		this.container.appendChild(this.svg);

		this.render();
	}

	/**
	 * Full render of the radar
	 */
	render(): void {
		this.renderPriorityRings();
		this.renderCategoryDividers();
		this.renderBlips();
	}

	/**
	 * Render priority rings (dashed concentric circles)
	 */
	private renderPriorityRings(): void {
		this.backgroundGroup.innerHTML = "";

		const { center, maxRadius, dashArray } = SVG_CONFIG;

		for (const priority of this.radarData.priorityLevels) {
			const radius = priority.maxRadius * maxRadius;
			const circle = createCircle(center, center, radius, "radar-priority-ring", {
				"stroke-dasharray": dashArray,
			});
			this.backgroundGroup.appendChild(circle);

			// Add priority label
			if (priority.name) {
				const labelX = center + 5;
				const labelY = center - radius + 15;
				const label = createText(labelX, labelY, priority.name, "radar-priority-label");
				this.backgroundGroup.appendChild(label);
			}
		}
	}

	/**
	 * Render category dividers (thin lines from center)
	 */
	private renderCategoryDividers(): void {
		this.categoryGroup.innerHTML = "";

		const { center, maxRadius } = SVG_CONFIG;
		const categories = this.radarData.categories;

		if (categories.length === 0) {
			return;
		}

		for (const category of categories) {
			const endPoint = polarToCartesian(1, category.startAngle, maxRadius);

			const line = createLine(
				center,
				center,
				center + endPoint.x,
				center + endPoint.y,
				"radar-category-divider"
			);
			this.categoryGroup.appendChild(line);

			// Add category label if named
			if (category.name) {
				// Position label at 60% radius in the middle of the segment
				const nextCategory = this.getNextCategory(category);
				const midAngle = this.getMidAngle(category.startAngle, nextCategory?.startAngle ?? category.startAngle + 360 / categories.length);
				const labelPos = polarToCartesian(0.6, midAngle, maxRadius);
				const label = createText(
					center + labelPos.x,
					center + labelPos.y,
					category.name,
					"radar-category-label"
				);
				this.categoryGroup.appendChild(label);
			}
		}
	}

	/**
	 * Get the next category in sequence
	 */
	private getNextCategory(current: { startAngle: number }): { startAngle: number } | undefined {
		const sorted = [...this.radarData.categories].sort((a, b) => a.startAngle - b.startAngle);
		const currentIndex = sorted.findIndex((c) => c.startAngle === current.startAngle);
		if (currentIndex === -1 || currentIndex === sorted.length - 1) {
			return sorted[0];
		}
		return sorted[currentIndex + 1];
	}

	/**
	 * Calculate mid angle between two angles
	 */
	private getMidAngle(startAngle: number, endAngle: number): number {
		if (endAngle < startAngle) {
			endAngle += 360;
		}
		return (startAngle + endAngle) / 2;
	}

	/**
	 * Render all blips
	 */
	private renderBlips(): void {
		this.blipsGroup.innerHTML = "";

		for (const blip of this.radarData.blips) {
			this.renderBlip(blip);
		}
	}

	/**
	 * Render a single blip
	 */
	private renderBlip(blip: Blip): void {
		const { maxRadius } = SVG_CONFIG;
		const { blipRadius } = this.options;

		const pos = polarToCartesian(blip.r, blip.theta, maxRadius);

		// Create blip group
		const blipGroup = createGroup("radar-blip", {
			"data-blip-id": blip.id,
			transform: `translate(${pos.x},${pos.y})`,
		});

		// Create blip circle
		const circle = createCircle(0, 0, blipRadius, "radar-blip-circle");
		if (blip.color) {
			circle.setAttribute("fill", blip.color);
		}

		// Create blip title
		const title = createText(0, -blipRadius - 5, blip.title, "radar-blip-title");

		blipGroup.appendChild(circle);
		blipGroup.appendChild(title);

		// Add click handler
		if (this.options.onBlipClick) {
			blipGroup.addEventListener("click", (e) => {
				e.stopPropagation();
				this.options.onBlipClick?.(blip.id);
			});
		}

		this.blipsGroup.appendChild(blipGroup);
	}

	/**
	 * Update the radar data and re-render
	 */
	updateData(radarData: RadarData): void {
		this.radarData = radarData;
		this.render();
	}

	/**
	 * Update a single blip's position
	 */
	updateBlipPosition(blipId: string, r: number, theta: number): void {
		const blipGroup = this.blipsGroup.querySelector(
			`[data-blip-id="${blipId}"]`
		) as SVGGElement;

		if (blipGroup) {
			const pos = polarToCartesian(r, theta, SVG_CONFIG.maxRadius);
			setAttributes(blipGroup, {
				transform: `translate(${pos.x},${pos.y})`,
			});
		}
	}

	/**
	 * Add a new blip to the render
	 */
	addBlip(blip: Blip): void {
		this.renderBlip(blip);
	}

	/**
	 * Remove a blip from the render
	 */
	removeBlip(blipId: string): void {
		const blipGroup = this.blipsGroup.querySelector(`[data-blip-id="${blipId}"]`);
		if (blipGroup) {
			blipGroup.remove();
		}
	}

	/**
	 * Set zoom level
	 */
	setZoom(zoom: number): void {
		const scale = zoom;
		//const offset = SVG_CONFIG.center * (1 - scale);
		this.svg.style.transform = `scale(${scale})`;
		this.svg.style.transformOrigin = "center center";
	}

	/**
	 * Get the SVG element
	 */
	getSvgElement(): SVGSVGElement {
		return this.svg;
	}

	/**
	 * Get the blips group element
	 */
	getBlipsGroup(): SVGGElement {
		return this.blipsGroup;
	}

	/**
	 * Clean up
	 */
	destroy(): void {
		this.svg.remove();
	}
}
