/**
 * Radar Interactions
 * Handles drag-and-drop and zoom interactions
 */

import { SVG_CONFIG } from "../constants";
import { cartesianToPolar, clamp } from "../utils/polarCoordinates";

export interface RadarInteractionsOptions {
	onBlipMove: (blipId: string, r: number, theta: number) => void;
	onZoomChange: (zoom: number) => void;
}

export class RadarInteractions {
	private svg: SVGSVGElement;
	private blipsGroup: SVGGElement;
	private options: RadarInteractionsOptions;

	private draggedBlip: SVGGElement | null = null;
	private dragStartX = 0;
	private dragStartY = 0;
	private currentZoom = 1;

	// Bound event handlers for proper removal
	private boundMouseMove: (e: MouseEvent) => void;
	private boundMouseUp: (e: MouseEvent) => void;
	private boundTouchMove: (e: TouchEvent) => void;
	private boundTouchEnd: (e: TouchEvent) => void;
	private boundWheel: (e: WheelEvent) => void;

	constructor(
		svg: SVGSVGElement,
		blipsGroup: SVGGElement,
		options: RadarInteractionsOptions
	) {
		this.svg = svg;
		this.blipsGroup = blipsGroup;
		this.options = options;

		// Bind event handlers
		this.boundMouseMove = this.onMouseMove.bind(this);
		this.boundMouseUp = this.onMouseUp.bind(this);
		this.boundTouchMove = this.onTouchMove.bind(this);
		this.boundTouchEnd = this.onTouchEnd.bind(this);
		this.boundWheel = this.onWheel.bind(this);

		this.setupEventListeners();
	}

	private setupEventListeners(): void {
		// Mouse events for drag
		this.blipsGroup.addEventListener("mousedown", this.onMouseDown.bind(this));
		document.addEventListener("mousemove", this.boundMouseMove);
		document.addEventListener("mouseup", this.boundMouseUp);

		// Touch events for mobile
		this.blipsGroup.addEventListener("touchstart", this.onTouchStart.bind(this), {
			passive: false,
		});
		document.addEventListener("touchmove", this.boundTouchMove, { passive: false });
		document.addEventListener("touchend", this.boundTouchEnd);

		// Wheel event for zoom
		this.svg.addEventListener("wheel", this.boundWheel, { passive: false });
	}

	/**
	 * Get SVG coordinates from screen coordinates
	 */
	private getSvgCoordinates(clientX: number, clientY: number): { x: number; y: number } {
		const rect = this.svg.getBoundingClientRect();
		const svgWidth = rect.width;
		const svgHeight = rect.height;

		// Convert to viewBox coordinates
		const x = ((clientX - rect.left) / svgWidth) * SVG_CONFIG.viewBoxSize;
		const y = ((clientY - rect.top) / svgHeight) * SVG_CONFIG.viewBoxSize;

		// Convert to center-relative coordinates
		return {
			x: x - SVG_CONFIG.center,
			y: y - SVG_CONFIG.center,
		};
	}

	/**
	 * Mouse down on blip - start drag
	 */
	private onMouseDown(e: MouseEvent): void {
		const target = e.target as SVGElement;
		const blipGroup = target.closest(".radar-blip") as SVGGElement;

		if (blipGroup) {
			e.preventDefault();
			this.startDrag(blipGroup, e.clientX, e.clientY);
		}
	}

	/**
	 * Touch start on blip - start drag
	 */
	private onTouchStart(e: TouchEvent): void {
		const target = e.target as SVGElement;
		const blipGroup = target.closest(".radar-blip") as SVGGElement;
		const touch = e.touches[0];

		if (blipGroup && e.touches.length === 1 && touch) {
			e.preventDefault();
			this.startDrag(blipGroup, touch.clientX, touch.clientY);
		}
	}

	/**
	 * Start dragging a blip
	 */
	private startDrag(blipGroup: SVGGElement, clientX: number, clientY: number): void {
		this.draggedBlip = blipGroup;
		this.dragStartX = clientX;
		this.dragStartY = clientY;

		blipGroup.classList.add("dragging");
	}

	/**
	 * Mouse move - update drag position
	 */
	private onMouseMove(e: MouseEvent): void {
		if (!this.draggedBlip) return;

		e.preventDefault();
		this.updateDragPosition(e.clientX, e.clientY);
	}

	/**
	 * Touch move - update drag position
	 */
	private onTouchMove(e: TouchEvent): void {
		const touch = e.touches[0];
		if (!this.draggedBlip || e.touches.length !== 1 || !touch) return;

		e.preventDefault();
		this.updateDragPosition(touch.clientX, touch.clientY);
	}

	/**
	 * Update blip position during drag
	 */
	private updateDragPosition(clientX: number, clientY: number): void {
		if (!this.draggedBlip) return;

		const coords = this.getSvgCoordinates(clientX, clientY);
		const polar = cartesianToPolar(coords.x, coords.y, SVG_CONFIG.maxRadius);

		// Clamp radius to valid range
		polar.r = clamp(polar.r, 0, 1);

		// Update visual position
		this.draggedBlip.setAttribute(
			"transform",
			`translate(${coords.x},${coords.y})`
		);
	}

	/**
	 * Mouse up - end drag
	 */
	private onMouseUp(e: MouseEvent): void {
		if (!this.draggedBlip) return;

		this.endDrag(e.clientX, e.clientY);
	}

	/**
	 * Touch end - end drag
	 */
	private onTouchEnd(): void {
		if (!this.draggedBlip) return;

		// Use last known position from touch move
		const blipId = this.draggedBlip.getAttribute("data-blip-id");
		if (blipId) {
			// Get current transform to extract position
			const transform = this.draggedBlip.getAttribute("transform");
			const match = transform?.match(/translate\(([^,]+),([^)]+)\)/);
			if (match && match[1] && match[2]) {
				const x = parseFloat(match[1]);
				const y = parseFloat(match[2]);
				const polar = cartesianToPolar(x, y, SVG_CONFIG.maxRadius);
				polar.r = clamp(polar.r, 0, 1);
				this.options.onBlipMove(blipId, polar.r, polar.theta);
			}
		}

		this.draggedBlip.classList.remove("dragging");
		this.draggedBlip = null;
	}

	/**
	 * End drag and save position
	 */
	private endDrag(clientX: number, clientY: number): void {
		if (!this.draggedBlip) return;

		const blipId = this.draggedBlip.getAttribute("data-blip-id");
		if (blipId) {
			const coords = this.getSvgCoordinates(clientX, clientY);
			const polar = cartesianToPolar(coords.x, coords.y, SVG_CONFIG.maxRadius);
			polar.r = clamp(polar.r, 0, 1);
			this.options.onBlipMove(blipId, polar.r, polar.theta);
		}

		this.draggedBlip.classList.remove("dragging");
		this.draggedBlip = null;
	}

	/**
	 * Wheel event for zoom
	 */
	private onWheel(e: WheelEvent): void {
		e.preventDefault();

		const delta = e.deltaY > 0 ? -SVG_CONFIG.zoomStep : SVG_CONFIG.zoomStep;
		const newZoom = clamp(
			this.currentZoom + delta,
			SVG_CONFIG.minZoom,
			SVG_CONFIG.maxZoom
		);

		if (newZoom !== this.currentZoom) {
			this.currentZoom = newZoom;
			this.options.onZoomChange(newZoom);
		}
	}

	/**
	 * Set current zoom level (for syncing with external state)
	 */
	setZoom(zoom: number): void {
		this.currentZoom = zoom;
	}

	/**
	 * Clean up event listeners
	 */
	destroy(): void {
		document.removeEventListener("mousemove", this.boundMouseMove);
		document.removeEventListener("mouseup", this.boundMouseUp);
		document.removeEventListener("touchmove", this.boundTouchMove);
		document.removeEventListener("touchend", this.boundTouchEnd);
		this.svg.removeEventListener("wheel", this.boundWheel);
	}
}
