/**
 * Radar Toolbar
 * Floating icon-only control panel overlaid on the radar
 */

import { setIcon, setTooltip } from "obsidian";

export interface RadarToolbarOptions {
	onAddNote: () => void;
	onAddText: () => void;
	onCustomize: () => void;
	onHelp: () => void;
	onToggleTitles: () => void;
	onToggleGlow: () => void;
	onTogglePriorityLabels: () => void;
	onZoomIn: () => void;
	onZoomOut: () => void;
	onResetZoom: () => void;
}

export class RadarToolbar {
	private container: HTMLElement;
	private titlesBtn: HTMLButtonElement | null = null;
	private glowBtn: HTMLButtonElement | null = null;
	private priorityLabelsBtn: HTMLButtonElement | null = null;

	constructor(container: HTMLElement, options: RadarToolbarOptions) {
		this.container = container;
		this.render(options);
	}

	private render(options: RadarToolbarOptions): void {
		this.container.empty();

		// Action group: add note, add text
		const actionGroup = this.container.createDiv({ cls: "radar-controls-group" });
		this.addButton(actionGroup, "file-plus", "Add note blip", options.onAddNote);
		this.addButton(actionGroup, "type-outline", "Add text blip", options.onAddText);

		// Zoom group: zoom in, reset, zoom out
		const zoomGroup = this.container.createDiv({ cls: "radar-controls-group" });
		this.addButton(zoomGroup, "plus", "Zoom in", options.onZoomIn);
		this.addButton(zoomGroup, "maximize", "Reset zoom", options.onResetZoom);
		this.addButton(zoomGroup, "minus", "Zoom out", options.onZoomOut);

		// Design group: toggle titles, toggle glow, toggle priority labels
		const designGroup = this.container.createDiv({ cls: "radar-controls-group" });
		this.titlesBtn = this.addButton(designGroup, "eye-off", "Hide titles", options.onToggleTitles);
		this.glowBtn = this.addButton(designGroup, "star-off", "Hide glow", options.onToggleGlow);
		this.priorityLabelsBtn = this.addButton(designGroup, "circle-parking-off", "Hide priority levels", options.onTogglePriorityLabels);

		// Settings group: customize, help
		const settingsGroup = this.container.createDiv({ cls: "radar-controls-group" });
		this.addButton(settingsGroup, "settings", "Customize", options.onCustomize);
		this.addButton(settingsGroup, "circle-help", "Help", options.onHelp);
	}

	setTitlesVisible(visible: boolean): void {
		if (!this.titlesBtn) return;
		setIcon(this.titlesBtn, visible ? "eye-off" : "eye");
		setTooltip(this.titlesBtn, visible ? "Hide titles" : "Show titles", {
			placement: "left",
			delay: 500,
		});
	}

	setGlowVisible(visible: boolean): void {
		if (!this.glowBtn) return;
		setIcon(this.glowBtn, visible ? "star-off" : "star");
		setTooltip(this.glowBtn, visible ? "Hide glow" : "Show glow", {
			placement: "left",
			delay: 500,
		});
	}

	setPriorityLabelsVisible(visible: boolean): void {
		if (!this.priorityLabelsBtn) return;
		setIcon(this.priorityLabelsBtn, visible ? "circle-parking-off" : "circle-parking");
		setTooltip(this.priorityLabelsBtn, visible ? "Hide priority levels" : "Show priority levels", {
			placement: "left",
			delay: 500,
		});
	}

	private addButton(
		group: HTMLElement,
		icon: string,
		tooltip: string,
		onClick: () => void
	): HTMLButtonElement {
		const btn = group.createEl("button", { cls: "radar-control-btn" });
		setIcon(btn, icon);
		setTooltip(btn, tooltip, { placement: "left", delay: 500 });
		btn.addEventListener("click", onClick);
		return btn;
	}
}
