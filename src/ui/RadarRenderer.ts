/**
 * Radar Renderer
 * Handles SVG rendering of the radar visualization
 */

import type { RadarData, Blip } from "../types";
import { SVG_CONFIG } from "../constants";
import { polarToCartesian } from "../utils/polarCoordinates";
import {
	createSvgContainer,
	createSvgElement,
	createCircle,
	createLine,
	createText,
	createGroup,
	setAttributes,
} from "../utils/svgHelpers";

export class RadarRenderer {
	private static readonly categoryLabelRadiusOffset = 28;
	private static readonly maxBlipTitleLength = 15;

	private svg: SVGSVGElement;
	private defsEl: SVGDefsElement;
	private backgroundGroup: SVGGElement;
	private segmentsGroup: SVGGElement;
	private categoryGroup: SVGGElement;
	private priorityLabelsGroup: SVGGElement;
	private blipsGroup: SVGGElement;
	private radarData: RadarData;

	// Transform state
	private currentPanX = 0;
	private currentPanY = 0;
	private currentZoom = 1;

	constructor(
		private container: HTMLElement,
		radarData: RadarData
	) {
		this.radarData = radarData;

		// Create SVG structure
		this.svg = createSvgContainer(SVG_CONFIG.viewBoxSize, "radar-svg");
		this.defsEl = createSvgElement("defs", {});
		this.backgroundGroup = createGroup("radar-background");
		this.segmentsGroup = createGroup("radar-category-segments");
		this.categoryGroup = createGroup("radar-categories");
		this.priorityLabelsGroup = createGroup("radar-priority-labels");
		this.blipsGroup = createGroup("radar-blips", {
			transform: `translate(${SVG_CONFIG.center},${SVG_CONFIG.center})`,
		});

		this.svg.appendChild(this.defsEl);
		this.svg.appendChild(this.backgroundGroup);
		this.svg.appendChild(this.segmentsGroup);
		this.svg.appendChild(this.categoryGroup);
		this.svg.appendChild(this.priorityLabelsGroup);
		this.svg.appendChild(this.blipsGroup);
		this.container.appendChild(this.svg);

		this.render();
	}

	/**
	 * Full render of the radar
	 */
	render(): void {
		this.renderPriorityRings();
		this.renderCategorySegments();
		this.renderCategoryDividers();
		this.renderBlips();
	}

	/**
	 * Render priority rings (dashed concentric circles)
	 */
	private renderPriorityRings(): void {
		this.backgroundGroup.innerHTML = "";
		this.priorityLabelsGroup.innerHTML = "";
		this.defsEl.innerHTML = "";

		const { center, maxRadius, dashArray } = SVG_CONFIG;

		for (const priority of this.radarData.priorityLevels) {
			const radius = priority.maxRadius * maxRadius;
			const circle = createCircle(center, center, radius, "radar-priority-ring", {
				"stroke-dasharray": dashArray,
			});
			this.backgroundGroup.appendChild(circle);

			// Add priority label curved along the inside of the ring,
			// centered on the vertical axis using a ±45° arc around 12 o'clock
			if (priority.name) {
				const labelRadius = radius - 2;
				const pathId = `radar-priority-arc-${priority.id}`;

				// Points at ±45° from 12 o'clock (compass angles: x=cx+r·sinθ, y=cy−r·cosθ)
				const halfAngle = Math.PI / 4;
				const dx = labelRadius * Math.sin(halfAngle);
				const dy = (labelRadius - 10) * Math.cos(halfAngle);
				const arcD = `M ${center - dx},${center - dy} A ${labelRadius},${labelRadius} 0 0 1 ${center + dx},${center - dy}`;

				const pathEl = createSvgElement("path", { id: pathId, d: arcD });
				this.defsEl.appendChild(pathEl);

				const textEl = createSvgElement("text", {
					class: "radar-priority-label",
					"text-anchor": "middle",
				});
				const textPathEl = createSvgElement("textPath", {
					href: `#${pathId}`,
					startOffset: "50%",
				});
				textPathEl.textContent = priority.name;
				textEl.appendChild(textPathEl);
				this.priorityLabelsGroup.appendChild(textEl);
			}
		}
	}

	/**
	 * Render filled arc segments for categories that have a color set
	 */
	private renderCategorySegments(): void {
		this.segmentsGroup.innerHTML = "";

		const { center, maxRadius } = SVG_CONFIG;
		const categories = this.radarData.categories;

		if (categories.length === 0) return;

		const sorted = [...categories].sort((a, b) => a.startAngle - b.startAngle);

		for (let i = 0; i < sorted.length; i++) {
			const cat = sorted[i];
			if (!cat || !cat.color) continue;

			const next = sorted[(i + 1) % sorted.length];
			const endAngle = next ? next.startAngle : sorted[0]!.startAngle;
			let sweepAngle = endAngle - cat.startAngle;
			if (sweepAngle <= 0) sweepAngle += 360;

			const path = this.buildArcPath(center, center, maxRadius, cat.startAngle, sweepAngle);
			path.setCssProps({ fill: cat.color, "fill-opacity": "0.12" });
			path.setAttribute("class", "radar-category-segment");
			this.segmentsGroup.appendChild(path);
		}
	}

	/**
	 * Build a pie-slice SVG path from center to arc
	 * Angles follow the same convention as polarToCartesian: counterclockwise from positive x-axis
	 */
	private buildArcPath(
		cx: number,
		cy: number,
		r: number,
		startDeg: number,
		sweepDeg: number
	): SVGPathElement {
		const toRad = (d: number) => (d * Math.PI) / 180;
		const x1 = cx + r * Math.cos(toRad(startDeg));
		const y1 = cy - r * Math.sin(toRad(startDeg));
		const endDeg = startDeg + sweepDeg;
		const x2 = cx + r * Math.cos(toRad(endDeg));
		const y2 = cy - r * Math.sin(toRad(endDeg));
		const largeArc = sweepDeg > 180 ? 1 : 0;
		return createSvgElement("path", {
			d: `M ${cx},${cy} L ${x1},${y1} A ${r},${r} 0 ${largeArc},0 ${x2},${y2} Z`,
		});
	}

	/**
	 * Render category dividers (thin lines from center)
	 */
	private renderCategoryDividers(): void {
		this.categoryGroup.innerHTML = "";

		const { center, maxRadius } = SVG_CONFIG;
		const categoryDividerExtension = 20;
		const categories = this.radarData.categories;

		if (categories.length === 0) {
			return;
		}

		for (const category of categories) {
			const endPoint = polarToCartesian(1, category.startAngle, maxRadius + categoryDividerExtension);

			const line = createLine(
				center,
				center,
				center + endPoint.x,
				center + endPoint.y,
				"radar-category-divider"
			);
			this.categoryGroup.appendChild(line);

			if (category.name.trim()) {
				const label = this.createCategoryArcLabel(category, center, maxRadius);
				this.categoryGroup.appendChild(label);
			}
		}
	}

	/**
	 * Create an outside-the-ring arc label for a category
	 */
	private createCategoryArcLabel(
		category: { id: string; name: string; startAngle: number },
		center: number,
		maxRadius: number
	): SVGTextElement {
		const nextCategory = this.getNextCategory(category);
		const endAngle = nextCategory?.startAngle ?? category.startAngle + 360 / this.radarData.categories.length;
		const sweepAngle = this.getSweepAngle(category.startAngle, endAngle);
		const midAngle = this.normalizeAngle(this.getMidAngle(category.startAngle, endAngle));
		const shouldReverseForReadableText = midAngle > 0 && midAngle < 180;
		const radius = maxRadius + RadarRenderer.categoryLabelRadiusOffset;
		const pathId = `radar-category-label-path-${category.id}`;
		const path = createSvgElement("path", {
			id: pathId,
			d: this.buildOpenArcPath(
				center,
				center,
				radius,
				shouldReverseForReadableText ? category.startAngle + sweepAngle : category.startAngle,
				shouldReverseForReadableText ? -sweepAngle : sweepAngle
			),
			fill: "none",
		});
		const text = createSvgElement("text", {
			class: "radar-category-label",
		});
		const textPath = createSvgElement("textPath", {
			href: `#${pathId}`,
			"startOffset": "50%",
		});
		textPath.textContent = category.name;
		text.appendChild(textPath);
		this.categoryGroup.appendChild(path);
		return text;
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

	private getSweepAngle(startAngle: number, endAngle: number): number {
		let sweepAngle = endAngle - startAngle;
		if (sweepAngle <= 0) {
			sweepAngle += 360;
		}
		return sweepAngle;
	}

	private normalizeAngle(angle: number): number {
		return ((angle % 360) + 360) % 360;
	}

	/**
	 * Build an open SVG arc path for category labels
	 */
	private buildOpenArcPath(
		cx: number,
		cy: number,
		r: number,
		startDeg: number,
		sweepDeg: number
	): string {
		const toRad = (d: number) => (d * Math.PI) / 180;
		const x1 = cx + r * Math.cos(toRad(startDeg));
		const y1 = cy - r * Math.sin(toRad(startDeg));
		const endDeg = startDeg + sweepDeg;
		const x2 = cx + r * Math.cos(toRad(endDeg));
		const y2 = cy - r * Math.sin(toRad(endDeg));
		const largeArc = Math.abs(sweepDeg) > 180 ? 1 : 0;
		const sweepFlag = sweepDeg >= 0 ? 0 : 1;
		return `M ${x1},${y1} A ${r},${r} 0 ${largeArc},${sweepFlag} ${x2},${y2}`;
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
		const { blipRadius } = this.radarData;

		const pos = polarToCartesian(blip.r, blip.theta, maxRadius);

		// Create blip group
		const blipGroup = createGroup("radar-blip", {
			"data-blip-id": blip.id,
			transform: `translate(${pos.x},${pos.y})`,
		});

		// Create dot — solid for notes, hollow ring for text blips
		const isText = blip.type === "text";
		const dot = createCircle(0, 0, blipRadius, isText ? "radar-blip-dot radar-blip-dot--text" : "radar-blip-dot");

		// Apply color: per-blip override, then radar default, then CSS accent fallback
		const effectiveColor = blip.color ?? this.radarData.blipColor;
		if (effectiveColor) {
			if (isText) {
				dot.style.stroke = effectiveColor;
			} else {
				dot.style.fill = effectiveColor;
			}
		}

		// Create blip title — truncated by default, expands to full on hover via CSS
		const titleY = -blipRadius * 2 - 4;
		const isTruncated = blip.title.length > RadarRenderer.maxBlipTitleLength;
		const shortTitle = createText(
			0, titleY,
			isTruncated ? blip.title.slice(0, RadarRenderer.maxBlipTitleLength) + "…" : blip.title,
			isTruncated ? "radar-blip-title radar-blip-title--short" : "radar-blip-title"
		);

		// Glow halo behind the dot
		const flare = createCircle(0, 0, blipRadius * 2, "radar-blip-flare");
		if (effectiveColor) {
			flare.style.fill = effectiveColor;
		}

		blipGroup.appendChild(flare);
		blipGroup.appendChild(dot);
		blipGroup.appendChild(shortTitle);

		if (isTruncated) {
			const fullTitle = createText(0, titleY, blip.title, "radar-blip-title radar-blip-title--full");
			blipGroup.appendChild(fullTitle);
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
	 * Apply combined transform (pan + zoom)
	 */
	setTransform(zoom: number, panX: number, panY: number): void {
		this.currentZoom = zoom;
		this.currentPanX = panX;
		this.currentPanY = panY;
		this.svg.setCssProps({
			transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
			"transform-origin": "center center",
		});
	}

	/**
	 * Set zoom level
	 */
	setZoom(zoom: number): void {
		this.setTransform(zoom, this.currentPanX, this.currentPanY);
	}

	/**
	 * Set pan offset
	 */
	setPan(panX: number, panY: number): void {
		this.setTransform(this.currentZoom, panX, panY);
	}

	/**
	 * Get current pan offset
	 */
	getPan(): { panX: number; panY: number } {
		return { panX: this.currentPanX, panY: this.currentPanY };
	}

	/**
	 * Get current zoom level
	 */
	getZoom(): number {
		return this.currentZoom;
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
	 * Show or hide blip titles (titles still appear on hover when hidden)
	 */
	setTitlesVisible(visible: boolean): void {
		if (visible) {
			this.blipsGroup.removeClass("radar-titles-hidden");
		} else {
			this.blipsGroup.addClass("radar-titles-hidden");
		}
	}

	/**
	 * Show or hide the glow halo on all blips
	 */
	setGlowVisible(visible: boolean): void {
		if (visible) {
			this.blipsGroup.removeClass("radar-glow-hidden");
		} else {
			this.blipsGroup.addClass("radar-glow-hidden");
		}
	}

	/**
	 * Show or hide the priority level labels on the rings
	 */
	setPriorityLabelsVisible(visible: boolean): void {
		if (visible) {
			this.priorityLabelsGroup.removeClass("radar-priority-labels-hidden");
		} else {
			this.priorityLabelsGroup.addClass("radar-priority-labels-hidden");
		}
	}

	/**
	 * Clean up
	 */
	destroy(): void {
		this.svg.remove();
	}
}
