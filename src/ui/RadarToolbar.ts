/**
 * Radar Toolbar
 * Toolbar component with add and zoom controls
 */

import { setIcon } from "obsidian";

export interface RadarToolbarOptions {
	onAddNote: () => void;
	onAddText: () => void;
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

		// Add note button
		const addNoteBtn = this.container.createEl("button", {
			cls: "radar-toolbar-btn",
			attr: { "aria-label": "Add note" },
		});
		setIcon(addNoteBtn, "file-plus");
		addNoteBtn.createSpan({ text: "Add note" });
		addNoteBtn.addEventListener("click", options.onAddNote);

		// Add text button
		const addTextBtn = this.container.createEl("button", {
			cls: "radar-toolbar-btn",
			attr: { "aria-label": "Add text" },
		});
		setIcon(addTextBtn, "text");
		addTextBtn.createSpan({ text: "Add text" });
		addTextBtn.addEventListener("click", options.onAddText);

		// Spacer
		this.container.createDiv({ cls: "radar-toolbar-spacer" });

		// Zoom controls
		const zoomOutBtn = this.container.createEl("button", {
			cls: "radar-toolbar-btn radar-toolbar-btn-icon",
			attr: { "aria-label": "Zoom out" },
		});
		setIcon(zoomOutBtn, "minus");
		zoomOutBtn.addEventListener("click", options.onZoomOut);

		const resetZoomBtn = this.container.createEl("button", {
			cls: "radar-toolbar-btn radar-toolbar-btn-icon",
			attr: { "aria-label": "Reset zoom" },
		});
		setIcon(resetZoomBtn, "maximize");
		resetZoomBtn.addEventListener("click", options.onResetZoom);

		const zoomInBtn = this.container.createEl("button", {
			cls: "radar-toolbar-btn radar-toolbar-btn-icon",
			attr: { "aria-label": "Zoom in" },
		});
		setIcon(zoomInBtn, "plus");
		zoomInBtn.addEventListener("click", options.onZoomIn);
	}
}
