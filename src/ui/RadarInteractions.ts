/**
 * Radar Interactions
 * Handles drag-and-drop and zoom interactions
 */

import { SVG_CONFIG } from "../constants";
import { cartesianToPolar, clamp } from "../utils/polarCoordinates";

export interface RadarInteractionsOptions {
	onBlipMove: (blipId: string, r: number, theta: number) => void;
	onBlipClick: (blipId: string, event: MouseEvent | TouchEvent) => void;
	onRadarContextMenu: (event: MouseEvent) => void;
	onFileDrop: (event: DragEvent, r: number, theta: number) => void;
	onZoomChange: (zoom: number) => void;
	onPanChange: (panX: number, panY: number) => void;
}

// Minimum distance in pixels to consider it a drag vs click
const DRAG_THRESHOLD = 5;

export class RadarInteractions {
	private eventSurface: HTMLElement;
	private svg: SVGSVGElement;
	private blipsGroup: SVGGElement;
	private options: RadarInteractionsOptions;

	// Blip drag state
	private draggedBlip: SVGGElement | null = null;
	private dragStartX = 0;
	private dragStartY = 0;
	private hasDragged = false;
	private currentZoom = 1;

	// Pan state
	private isPanning = false;
	private panStartX = 0;
	private panStartY = 0;
	private currentPanX = 0;
	private currentPanY = 0;
	private panStartOffsetX = 0;
	private panStartOffsetY = 0;

	// Bound event handlers for proper removal
	private boundMouseMove: (e: MouseEvent) => void;
	private boundMouseUp: (e: MouseEvent) => void;
	private boundTouchMove: (e: TouchEvent) => void;
	private boundTouchEnd: (e: TouchEvent) => void;
	private boundWheel: (e: WheelEvent) => void;
	private boundMouseDown: (e: MouseEvent) => void;
	private boundTouchStart: (e: TouchEvent) => void;
	private boundContextMenu: (e: MouseEvent) => void;
	private boundDragEnter: (e: DragEvent) => void;
	private boundDragOver: (e: DragEvent) => void;
	private boundDragLeave: (e: DragEvent) => void;
	private boundDrop: (e: DragEvent) => void;

	constructor(
		eventSurface: HTMLElement,
		svg: SVGSVGElement,
		blipsGroup: SVGGElement,
		options: RadarInteractionsOptions
	) {
		this.eventSurface = eventSurface;
		this.svg = svg;
		this.blipsGroup = blipsGroup;
		this.options = options;

		// Bind event handlers
		this.boundMouseMove = this.onMouseMove.bind(this);
		this.boundMouseUp = this.onMouseUp.bind(this);
		this.boundTouchMove = this.onTouchMove.bind(this);
		this.boundTouchEnd = (e: TouchEvent) => this.onTouchEnd(e);
		this.boundWheel = this.onWheel.bind(this);
		this.boundMouseDown = this.onSvgMouseDown.bind(this);
		this.boundTouchStart = this.onSvgTouchStart.bind(this);
		this.boundContextMenu = this.onContextMenu.bind(this);
		this.boundDragEnter = this.onDragEnter.bind(this);
		this.boundDragOver = this.onDragOver.bind(this);
		this.boundDragLeave = this.onDragLeave.bind(this);
		this.boundDrop = this.onDrop.bind(this);

		this.setupEventListeners();
	}

	private setupEventListeners(): void {
		// Use the full container as the interaction surface so padding around the SVG still pans/zooms.
		this.eventSurface.addEventListener("mousedown", this.boundMouseDown);
		document.addEventListener("mousemove", this.boundMouseMove);
		document.addEventListener("mouseup", this.boundMouseUp);

		this.eventSurface.addEventListener("touchstart", this.boundTouchStart, {
			passive: false,
		});
		document.addEventListener("touchmove", this.boundTouchMove, { passive: false });
		document.addEventListener("touchend", this.boundTouchEnd);

		// Capture wheel on the document so parent Obsidian panes can't steal it first.
		document.addEventListener("wheel", this.boundWheel, {
			passive: false,
			capture: true,
		});
		this.eventSurface.addEventListener("contextmenu", this.boundContextMenu);
		this.eventSurface.addEventListener("dragenter", this.boundDragEnter);
		this.eventSurface.addEventListener("dragover", this.boundDragOver);
		this.eventSurface.addEventListener("dragleave", this.boundDragLeave);
		this.eventSurface.addEventListener("drop", this.boundDrop);
	}

	/**
	 * Get SVG coordinates from screen coordinates
	 * Accounts for current pan and zoom transforms
	 */
	private getSvgCoordinates(clientX: number, clientY: number): { x: number; y: number } {
		const rect = this.svg.getBoundingClientRect();
		const svgWidth = rect.width;
		const svgHeight = rect.height;

		// preserveAspectRatio="xMidYMid meet" renders the square viewBox into the
		// largest centered square that fits in the SVG element. If the host area is
		// not square, there is letterboxing that must be removed from pointer math.
		const renderedSize = Math.min(svgWidth, svgHeight);
		const renderedLeft = rect.left + (svgWidth - renderedSize) / 2;
		const renderedTop = rect.top + (svgHeight - renderedSize) / 2;

		// Convert screen coordinates into viewBox coordinates, then shift to the
		// radar-centered coordinate system used by blip transforms.
		const viewBoxX =
			((clientX - renderedLeft) / renderedSize) * SVG_CONFIG.viewBoxSize;
		const viewBoxY =
			((clientY - renderedTop) / renderedSize) * SVG_CONFIG.viewBoxSize;
		const x = viewBoxX - SVG_CONFIG.center;
		const y = viewBoxY - SVG_CONFIG.center;

		return { x, y };
	}

	/**
	 * Mouse down on SVG - start blip drag or pan
	 */
	private onSvgMouseDown(e: MouseEvent): void {
		if (e.button !== 0) {
			return;
		}

		const target = e.target as SVGElement;
		const blipGroup = target.closest(".radar-blip") as SVGGElement;

		if (blipGroup) {
			// Clicked on a blip - start blip drag
			e.preventDefault();
			this.startDrag(blipGroup, e.clientX, e.clientY);
		} else {
			// Left-drag on empty space pans the radar.
			e.preventDefault();
			this.startPan(e.clientX, e.clientY);
		}
	}

	/**
	 * Touch start on SVG - start blip drag or pan
	 */
	private onSvgTouchStart(e: TouchEvent): void {
		const target = e.target as SVGElement;
		const blipGroup = target.closest(".radar-blip") as SVGGElement;
		const touch = e.touches[0];

		if (e.touches.length !== 1 || !touch) return;

		if (blipGroup) {
			// Touched a blip - start blip drag
			e.preventDefault();
			this.startDrag(blipGroup, touch.clientX, touch.clientY);
		} else {
			// Touched empty space - start pan
			e.preventDefault();
			this.startPan(touch.clientX, touch.clientY);
		}
	}

	/**
	 * Start dragging a blip
	 */
	private startDrag(blipGroup: SVGGElement, clientX: number, clientY: number): void {
		this.draggedBlip = blipGroup;
		this.dragStartX = clientX;
		this.dragStartY = clientY;
		this.hasDragged = false;

		blipGroup.classList.add("dragging");
	}

	/**
	 * Start panning the radar
	 */
	private startPan(clientX: number, clientY: number): void {
		this.isPanning = true;
		this.panStartX = clientX;
		this.panStartY = clientY;
		this.panStartOffsetX = this.currentPanX;
		this.panStartOffsetY = this.currentPanY;

		this.eventSurface.classList.add("panning");
	}

	/**
	 * Mouse move - update drag or pan position
	 */
	private onMouseMove(e: MouseEvent): void {
		if (this.draggedBlip) {
			e.preventDefault();
			this.updateDragPosition(e.clientX, e.clientY);
		} else if (this.isPanning) {
			e.preventDefault();
			this.updatePanPosition(e.clientX, e.clientY);
		}
	}

	/**
	 * Touch move - update drag or pan position
	 */
	private onTouchMove(e: TouchEvent): void {
		const touch = e.touches[0];
		if (e.touches.length !== 1 || !touch) return;

		if (this.draggedBlip) {
			e.preventDefault();
			this.updateDragPosition(touch.clientX, touch.clientY);
		} else if (this.isPanning) {
			e.preventDefault();
			this.updatePanPosition(touch.clientX, touch.clientY);
		}
	}

	/**
	 * Update blip position during drag
	 */
	private updateDragPosition(clientX: number, clientY: number): void {
		if (!this.draggedBlip) return;

		// Check if we've moved beyond the drag threshold
		const deltaX = clientX - this.dragStartX;
		const deltaY = clientY - this.dragStartY;
		const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
		if (distance > DRAG_THRESHOLD) {
			this.hasDragged = true;
		}

		const coords = this.getSvgCoordinates(clientX, clientY);
		const clampedX = clamp(coords.x, -SVG_CONFIG.center, SVG_CONFIG.center);
		const clampedY = clamp(coords.y, -SVG_CONFIG.center, SVG_CONFIG.center);

		// Update visual position
		this.draggedBlip.setAttribute(
			"transform",
			`translate(${clampedX},${clampedY})`
		);
	}

	/**
	 * Update pan position during drag
	 */
	private updatePanPosition(clientX: number, clientY: number): void {
		const deltaX = clientX - this.panStartX;
		const deltaY = clientY - this.panStartY;

		this.currentPanX = this.panStartOffsetX + deltaX;
		this.currentPanY = this.panStartOffsetY + deltaY;

		this.options.onPanChange(this.currentPanX, this.currentPanY);
	}

	/**
	 * Mouse up - end drag or pan
	 */
	private onMouseUp(e: MouseEvent): void {
		if (this.draggedBlip) {
			this.endDrag(e.clientX, e.clientY, e);
		} else if (this.isPanning) {
			this.endPan();
		}
	}

	/**
	 * Touch end - end drag or pan
	 */
	private onTouchEnd(e: TouchEvent): void {
		if (this.draggedBlip) {
			const blipId = this.draggedBlip.getAttribute("data-blip-id");
			if (blipId) {
				if (this.hasDragged) {
					// It was a drag - use last known position from touch move
					const transform = this.draggedBlip.getAttribute("transform");
					const match = transform?.match(/translate\(([^,]+),([^)]+)\)/);
					if (match && match[1] && match[2]) {
						const x = parseFloat(match[1]);
						const y = parseFloat(match[2]);
						const polar = cartesianToPolar(x, y, SVG_CONFIG.maxRadius);
						this.options.onBlipMove(blipId, polar.r, polar.theta);
					}
				} else {
					// It was a tap - trigger click callback
					this.options.onBlipClick(blipId, e);
				}
			}

			this.draggedBlip.classList.remove("dragging");
			this.draggedBlip = null;
		} else if (this.isPanning) {
			this.endPan();
		}
	}

	/**
	 * End drag and save position, or trigger click if no drag occurred
	 */
	private endDrag(clientX: number, clientY: number, event: MouseEvent): void {
		if (!this.draggedBlip) return;

		const blipId = this.draggedBlip.getAttribute("data-blip-id");
		if (blipId) {
			if (this.hasDragged) {
				// It was a drag - update position
				const coords = this.getSvgCoordinates(clientX, clientY);
				const clampedX = clamp(coords.x, -SVG_CONFIG.center, SVG_CONFIG.center);
				const clampedY = clamp(coords.y, -SVG_CONFIG.center, SVG_CONFIG.center);
				const polar = cartesianToPolar(clampedX, clampedY, SVG_CONFIG.maxRadius);
				this.options.onBlipMove(blipId, polar.r, polar.theta);
			}
		}

		this.draggedBlip.classList.remove("dragging");
		this.draggedBlip = null;
	}

	/**
	 * End panning
	 */
	private endPan(): void {
		this.isPanning = false;
		this.eventSurface.classList.remove("panning");
	}

	/**
	 * Open the blip context menu on right-click and leave other targets alone.
	 */
	private onContextMenu(e: MouseEvent): void {
		const target = e.target as SVGElement;
		const blipGroup = target.closest(".radar-blip");
		const blipId = blipGroup?.getAttribute("data-blip-id");

		e.preventDefault();

		if (blipId) {
			this.options.onBlipClick(blipId, e);
		} else {
			this.options.onRadarContextMenu(e);
		}
	}

	/**
	 * Wheel event - handles both zoom and pan depending on input device
	 * - Trackpad pinch (ctrlKey) or mouse wheel: zoom
	 * - Trackpad two-finger scroll: pan
	 */
	private onWheel(e: WheelEvent): void {
		const target = e.target;
		if (!(target instanceof Node) || !this.eventSurface.contains(target)) {
			return;
		}

		e.preventDefault();
		e.stopPropagation();

		this.handleZoom(e.deltaY);
	}

	/**
	 * Handle zoom from wheel delta
	 */
	private handleZoom(deltaY: number): void {
		const delta = deltaY > 0 ? -SVG_CONFIG.zoomStep : SVG_CONFIG.zoomStep;
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
	 * Return the polar coordinates of the center of the currently visible area
	 */
	getViewCenter(): { r: number; theta: number } {
		const rect = this.eventSurface.getBoundingClientRect();
		return this.getRadarPosition(
			rect.left + rect.width / 2,
			rect.top + rect.height / 2
		);
	}

	/**
	 * Convert screen coordinates to radar polar coordinates
	 */
	getRadarPosition(clientX: number, clientY: number): { r: number; theta: number } {
		const coords = this.getSvgCoordinates(clientX, clientY);
		const clampedX = clamp(coords.x, -SVG_CONFIG.center, SVG_CONFIG.center);
		const clampedY = clamp(coords.y, -SVG_CONFIG.center, SVG_CONFIG.center);
		return cartesianToPolar(clampedX, clampedY, SVG_CONFIG.maxRadius);
	}

	/**
	 * Set current zoom level (for syncing with external state)
	 */
	setZoom(zoom: number): void {
		this.currentZoom = zoom;
	}

	/**
	 * Set current pan offset (for syncing with external state)
	 */
	setPan(panX: number, panY: number): void {
		this.currentPanX = panX;
		this.currentPanY = panY;
	}

	/**
	 * File drag-and-drop from the file explorer
	 */
	private onDragEnter(e: DragEvent): void {
		if (e.dataTransfer?.types.includes("text/plain")) {
			e.preventDefault();
			this.eventSurface.addClass("drag-over");
		}
	}

	private onDragOver(e: DragEvent): void {
		if (e.dataTransfer?.types.includes("text/plain")) {
			e.preventDefault();
		}
	}

	private onDragLeave(e: DragEvent): void {
		// Only clear when leaving the surface itself, not a child element
		if (!this.eventSurface.contains(e.relatedTarget as Node)) {
			this.eventSurface.removeClass("drag-over");
		}
	}

	private onDrop(e: DragEvent): void {
		e.preventDefault();
		this.eventSurface.removeClass("drag-over");

		const coords = this.getSvgCoordinates(e.clientX, e.clientY);
		const clampedX = clamp(coords.x, -SVG_CONFIG.center, SVG_CONFIG.center);
		const clampedY = clamp(coords.y, -SVG_CONFIG.center, SVG_CONFIG.center);
		const polar = cartesianToPolar(clampedX, clampedY, SVG_CONFIG.maxRadius);

		this.options.onFileDrop(e, polar.r, polar.theta);
	}

	/**
	 * Clean up event listeners
	 */
	destroy(): void {
		this.eventSurface.removeEventListener("mousedown", this.boundMouseDown);
		this.eventSurface.removeEventListener("touchstart", this.boundTouchStart);
		this.eventSurface.removeEventListener("contextmenu", this.boundContextMenu);
		document.removeEventListener("mousemove", this.boundMouseMove);
		document.removeEventListener("mouseup", this.boundMouseUp);
		document.removeEventListener("touchmove", this.boundTouchMove);
		document.removeEventListener("touchend", this.boundTouchEnd);
		document.removeEventListener("wheel", this.boundWheel, true);
		this.eventSurface.removeEventListener("dragenter", this.boundDragEnter);
		this.eventSurface.removeEventListener("dragover", this.boundDragOver);
		this.eventSurface.removeEventListener("dragleave", this.boundDragLeave);
		this.eventSurface.removeEventListener("drop", this.boundDrop);
	}
}
