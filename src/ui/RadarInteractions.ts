/**
 * Radar Interactions
 * Handles drag-and-drop and zoom interactions
 */

import { SVG_CONFIG } from "../constants";
import { cartesianToPolar, clamp } from "../utils/polarCoordinates";

export interface RadarInteractionsOptions {
	onBlipMove: (blipId: string, r: number, theta: number) => void;
	onBlipClick: (blipId: string, event: MouseEvent | TouchEvent) => void;
	onZoomChange: (zoom: number) => void;
	onPanChange: (panX: number, panY: number) => void;
}

// Minimum distance in pixels to consider it a drag vs click
const DRAG_THRESHOLD = 5;

export class RadarInteractions {
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
		this.boundTouchEnd = (e: TouchEvent) => this.onTouchEnd(e);
		this.boundWheel = this.onWheel.bind(this);

		this.setupEventListeners();
	}

	private setupEventListeners(): void {
		// Mouse events for drag and pan - listen on SVG to catch both blips and empty space
		this.svg.addEventListener("mousedown", this.onSvgMouseDown.bind(this));
		document.addEventListener("mousemove", this.boundMouseMove);
		document.addEventListener("mouseup", this.boundMouseUp);

		// Touch events for mobile - listen on SVG for both blips and pan
		this.svg.addEventListener("touchstart", this.onSvgTouchStart.bind(this), {
			passive: false,
		});
		document.addEventListener("touchmove", this.boundTouchMove, { passive: false });
		document.addEventListener("touchend", this.boundTouchEnd);

		// Wheel event for zoom
		this.svg.addEventListener("wheel", this.boundWheel, { passive: false });
	}

	/**
	 * Get SVG coordinates from screen coordinates
	 * Accounts for current pan and zoom transforms
	 */
	private getSvgCoordinates(clientX: number, clientY: number): { x: number; y: number } {
		const rect = this.svg.getBoundingClientRect();
		const svgWidth = rect.width;
		const svgHeight = rect.height;

		// Calculate the center of the SVG in screen coordinates
		const svgCenterX = rect.left + svgWidth / 2;
		const svgCenterY = rect.top + svgHeight / 2;

		// Get offset from center in screen pixels, then adjust for zoom
		const offsetX = (clientX - svgCenterX) / this.currentZoom;
		const offsetY = (clientY - svgCenterY) / this.currentZoom;

		// Convert screen pixel offset to viewBox units
		// The SVG has a viewBox of viewBoxSize x viewBoxSize, displayed at svgWidth x svgHeight (after zoom)
		const baseScale = svgWidth / SVG_CONFIG.viewBoxSize;
		const x = offsetX / baseScale;
		const y = offsetY / baseScale;

		return { x, y };
	}

	/**
	 * Mouse down on SVG - start blip drag or pan
	 */
	private onSvgMouseDown(e: MouseEvent): void {
		const target = e.target as SVGElement;
		const blipGroup = target.closest(".radar-blip") as SVGGElement;

		if (blipGroup) {
			// Clicked on a blip - start blip drag
			e.preventDefault();
			this.startDrag(blipGroup, e.clientX, e.clientY);
		} else {
			// Clicked on empty space - start pan
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

		this.svg.classList.add("panning");
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
						polar.r = clamp(polar.r, 0, 1);
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
				const polar = cartesianToPolar(coords.x, coords.y, SVG_CONFIG.maxRadius);
				polar.r = clamp(polar.r, 0, 1);
				this.options.onBlipMove(blipId, polar.r, polar.theta);
			} else {
				// It was a click - trigger click callback
				this.options.onBlipClick(blipId, event);
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
		this.svg.classList.remove("panning");
	}

	/**
	 * Wheel event - handles both zoom and pan depending on input device
	 * - Trackpad pinch (ctrlKey) or mouse wheel: zoom
	 * - Trackpad two-finger scroll: pan
	 */
	private onWheel(e: WheelEvent): void {
		e.preventDefault();

		// Pinch gesture on trackpad sets ctrlKey = true
		// Also handles Ctrl+scroll on mouse for zooming
		if (e.ctrlKey) {
			this.handleZoom(e.deltaY);
			return;
		}

		// Detect input device by deltaMode:
		// - deltaMode 0 (DOM_DELTA_PIXEL): typically trackpad
		// - deltaMode 1 (DOM_DELTA_LINE): typically mouse wheel
		// - deltaMode 2 (DOM_DELTA_PAGE): rare, treat as mouse
		const isTrackpad = e.deltaMode === 0;

		if (isTrackpad) {
			// Trackpad two-finger scroll = pan
			this.currentPanX -= e.deltaX;
			this.currentPanY -= e.deltaY;
			this.options.onPanChange(this.currentPanX, this.currentPanY);
		} else {
			// Mouse wheel = zoom
			this.handleZoom(e.deltaY);
		}
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
