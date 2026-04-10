/**
 * Radar Toolbar
 * Floating icon-only control panel overlaid on the radar
 */

import { setIcon, setTooltip } from "obsidian";

export interface RadarToolbarOptions {
	onAddNote: () => void;
	onAddText: () => void;
	onCustomize: () => void;
	onZoomIn: () => void;
	onZoomOut: () => void;
	onResetZoom: () => void;
}

export class RadarToolbar {
	private container: HTMLElement;

	constructor(container: HTMLElement, options: RadarToolbarOptions) {
		this.container = container;
		this.render(options);
	}

	private render(options: RadarToolbarOptions): void {
		this.container.empty();

		// Action group: add note, add text, customize
		const actionGroup = this.container.createDiv({ cls: "radar-controls-group" });
		this.addButton(actionGroup, "file-plus", "Add note blip", options.onAddNote);
		this.addButton(actionGroup, "type-outline", "Add text blip", options.onAddText);

		// Zoom group: zoom in, reset, zoom out
		const zoomGroup = this.container.createDiv({ cls: "radar-controls-group" });
		this.addButton(zoomGroup, "plus", "Zoom in", options.onZoomIn);
		this.addButton(zoomGroup, "maximize", "Reset zoom", options.onResetZoom);
		this.addButton(zoomGroup, "minus", "Zoom out", options.onZoomOut);

		// Action group: customize
		const customizeGroup = this.container.createDiv({ cls: "radar-controls-group" });
		this.addButton(customizeGroup, "settings", "Customize", options.onCustomize);
	}

	private addButton(
		group: HTMLElement,
		icon: string,
		tooltip: string,
		onClick: () => void
	): void {
		const btn = group.createEl("button", { cls: "radar-control-btn" });
		setIcon(btn, icon);
		setTooltip(btn, tooltip, { placement: "left", delay: 500 });
		btn.addEventListener("click", onClick);
	}
}
