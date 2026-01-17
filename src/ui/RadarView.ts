/**
 * Radar View
 * TextFileView subclass for displaying and interacting with a radar
 */

import { TextFileView, WorkspaceLeaf, Menu } from "obsidian";
import type RadarPlugin from "../main";
import type { RadarData, Blip } from "../types";
import { VIEW_TYPE_RADAR, SVG_CONFIG } from "../constants";
import { RadarRenderer } from "./RadarRenderer";
import { RadarToolbar } from "./RadarToolbar";
import { RadarInteractions } from "./RadarInteractions";
import { AddBlipModal } from "./AddBlipModal";
import { AddTextModal } from "./AddTextModal";

export class RadarView extends TextFileView {
	private plugin: RadarPlugin;
	private radarData: RadarData | null = null;
	private renderer: RadarRenderer | null = null;
	private toolbar: RadarToolbar | null = null;
	private interactions: RadarInteractions | null = null;
	private mainContainer: HTMLElement | null = null;
	private svgContainer: HTMLElement | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: RadarPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return VIEW_TYPE_RADAR;
	}

	getDisplayText(): string {
		return this.file?.basename ?? "Radar";
	}

	getIcon(): string {
		return "target";
	}

	/**
	 * Called by TextFileView - return the current data to save
	 */
	getViewData(): string {
		if (this.radarData) {
			return JSON.stringify(this.radarData, null, 2);
		}
		return this.data;
	}

	/**
	 * Called by TextFileView - receive file data and render
	 */
	setViewData(data: string, clear: boolean): void {
		if (clear) {
			this.clear();
		}

		try {
			this.radarData = JSON.parse(data) as RadarData;
			this.renderRadar();
		} catch (error) {
			console.error("Failed to parse radar data:", error);
			this.showError("Failed to load radar data - invalid JSON");
		}
	}

	/**
	 * Called by TextFileView - clear the view
	 */
	clear(): void {
		this.radarData = null;
		if (this.renderer) {
			this.renderer.destroy();
			this.renderer = null;
		}
		if (this.interactions) {
			this.interactions.destroy();
			this.interactions = null;
		}
	}

	async onOpen(): Promise<void> {
		const container = this.contentEl;
		container.empty();
		container.addClass("radar-view-container");

		// Create main container
		this.mainContainer = container.createDiv({ cls: "radar-main" });

		// Create toolbar container
		const toolbarContainer = this.mainContainer.createDiv({ cls: "radar-toolbar" });

		// Create SVG container
		this.svgContainer = this.mainContainer.createDiv({ cls: "radar-svg-container" });

		// Create toolbar
		this.toolbar = new RadarToolbar(toolbarContainer, {
			onAddNote: () => this.openAddNoteModal(),
			onAddText: () => this.openAddTextModal(),
			onZoomIn: () => this.zoomIn(),
			onZoomOut: () => this.zoomOut(),
			onResetZoom: () => this.resetZoom(),
		});
	}

	async onClose(): Promise<void> {
		this.clear();
		this.toolbar = null;
	}

	/**
	 * Render the radar visualization
	 */
	private renderRadar(): void {
		if (!this.radarData || !this.svgContainer) return;

		// Clean up existing renderer
		if (this.renderer) {
			this.renderer.destroy();
		}
		if (this.interactions) {
			this.interactions.destroy();
		}

		// Clear container
		this.svgContainer.empty();

		// Create renderer
		this.renderer = new RadarRenderer(this.svgContainer, this.radarData, {
			blipRadius: this.plugin.settings.blipRadius,
			onBlipClick: (blipId, event) => this.onBlipClick(blipId, event),
		});

		// Create interactions handler
		this.interactions = new RadarInteractions(
			this.renderer.getSvgElement(),
			this.renderer.getBlipsGroup(),
			{
				onBlipMove: (blipId, r, theta) => this.onBlipMove(blipId, r, theta),
				onZoomChange: (zoom) => this.onZoomChange(zoom),
				onPanChange: (panX, panY) => this.onPanChange(panX, panY),
			}
		);

		// Apply saved view state (zoom and pan)
		const { zoom, panX, panY } = this.radarData.viewState;
		if (zoom !== 1 || panX !== 0 || panY !== 0) {
			this.renderer.setTransform(zoom, panX, panY);
			this.interactions.setZoom(zoom);
			this.interactions.setPan(panX, panY);
		}
	}

	/**
	 * Handle blip click
	 */
	private onBlipClick(blipId: string, event: MouseEvent): void {
		const blip = this.radarData?.blips.find((b) => b.id === blipId);
		if (!blip) return;

		const menu = new Menu();

		// If it's a note blip, offer to open the note
		if (blip.type === "note" && blip.notePath) {
			menu.addItem((item) =>
				item
					.setTitle("Open note")
					.setIcon("file")
					.onClick(() => {
						if (blip.notePath) {
							void this.app.workspace.openLinkText(blip.notePath, "");
						}
					})
			);
		}

		menu.addItem((item) =>
			item
				.setTitle("Remove from radar")
				.setIcon("trash")
				.onClick(() => this.removeBlip(blipId))
		);

		menu.showAtMouseEvent(event);
	}

	/**
	 * Handle blip move (drag end)
	 */
	private onBlipMove(blipId: string, r: number, theta: number): void {
		if (!this.radarData) return;

		this.plugin.radarStore.updateBlipPosition(this.radarData, blipId, r, theta);
		this.requestSave();
	}

	/**
	 * Handle zoom change
	 */
	private onZoomChange(zoom: number): void {
		if (!this.radarData) return;

		this.radarData.viewState.zoom = zoom;
		this.renderer?.setZoom(zoom);
		this.requestSave();
	}

	/**
	 * Handle pan change
	 */
	private onPanChange(panX: number, panY: number): void {
		if (!this.radarData) return;

		this.radarData.viewState.panX = panX;
		this.radarData.viewState.panY = panY;
		this.renderer?.setPan(panX, panY);
		this.requestSave();
	}

	/**
	 * Open modal to add a note blip
	 */
	private openAddNoteModal(): void {
		if (!this.radarData) return;

		const modal = new AddBlipModal(this.app, (notePath, title) => {
			this.addBlip({
				type: "note",
				title,
				notePath,
				r: 0.5, // Default to middle
				theta: Math.random() * 360, // Random angle
			});
		});
		modal.open();
	}

	/**
	 * Open modal to add a text blip
	 */
	private openAddTextModal(): void {
		if (!this.radarData) return;

		const modal = new AddTextModal(this.app, (title) => {
			this.addBlip({
				type: "text",
				title,
				r: 0.5,
				theta: Math.random() * 360,
			});
		});
		modal.open();
	}

	/**
	 * Add a blip to the radar
	 */
	private addBlip(blipData: Omit<Blip, "id" | "createdAt" | "updatedAt">): void {
		if (!this.radarData) return;

		const blip = this.plugin.radarStore.addBlip(this.radarData, blipData);
		this.renderer?.addBlip(blip);
		this.requestSave();
	}

	/**
	 * Remove a blip from the radar
	 */
	private removeBlip(blipId: string): void {
		if (!this.radarData) return;

		this.plugin.radarStore.removeBlip(this.radarData, blipId);
		this.renderer?.removeBlip(blipId);
		this.requestSave();
	}

	/**
	 * Zoom controls
	 */
	private zoomIn(): void {
		if (!this.radarData) return;
		const newZoom = Math.min(
			this.radarData.viewState.zoom + SVG_CONFIG.zoomStep,
			SVG_CONFIG.maxZoom
		);
		this.onZoomChange(newZoom);
	}

	private zoomOut(): void {
		if (!this.radarData) return;
		const newZoom = Math.max(
			this.radarData.viewState.zoom - SVG_CONFIG.zoomStep,
			SVG_CONFIG.minZoom
		);
		this.onZoomChange(newZoom);
	}

	private resetZoom(): void {
		// Reset both zoom and pan
		this.onZoomChange(1);
		this.onPanChange(0, 0);
		this.interactions?.setZoom(1);
		this.interactions?.setPan(0, 0);
	}

	/**
	 * Show error message
	 */
	private showError(message: string): void {
		if (this.svgContainer) {
			this.svgContainer.empty();
			this.svgContainer.createEl("p", {
				text: message,
				cls: "radar-error",
			});
		}
	}
}
