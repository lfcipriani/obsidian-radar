/**
 * Radar View
 * TextFileView subclass for displaying and interacting with a radar
 */

import { TextFileView, WorkspaceLeaf, Menu, TFile } from "obsidian";
import type RadarPlugin from "../main";
import type { RadarData, Blip, ViewState } from "../types";
import { VIEW_TYPE_RADAR, SVG_CONFIG, DEFAULT_VIEW_STATE } from "../constants";
import { RadarRenderer } from "./RadarRenderer";
import { RadarToolbar } from "./RadarToolbar";
import { RadarInteractions } from "./RadarInteractions";
import { AddBlipModal } from "./AddBlipModal";
import { AddTextModal } from "./AddTextModal";
import { CustomizeRadarModal } from "./CustomizeRadarModal";
import { HelpModal } from "./HelpModal";

export class RadarView extends TextFileView {
	private plugin: RadarPlugin;
	private radarData: RadarData | null = null;
	private viewState: ViewState = { ...DEFAULT_VIEW_STATE };
	private titlesVisible = true;
	private glowVisible = true;
	private priorityLabelsVisible = true;
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
		return "radar";
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
			this.radarData = this.plugin.radarStore.normalizeRadarData(
				JSON.parse(data) as Partial<RadarData>
			);
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

		// Create SVG container
		this.svgContainer = this.mainContainer.createDiv({ cls: "radar-svg-container" });

		// Create floating controls panel — sibling of svgContainer so renderRadar's
		// svgContainer.empty() never destroys it
		const toolbarContainer = this.mainContainer.createDiv({ cls: "radar-controls" });

		// Create toolbar
		this.toolbar = new RadarToolbar(toolbarContainer, {
			onAddNote: () => this.addNoteBlip(),
			onAddText: () => this.addTextBlip(),
			onCustomize: () => this.openCustomizeModal(),
			onHelp: () => this.openHelpModal(),
			onToggleTitles: () => this.toggleTitles(),
			onToggleGlow: () => this.toggleGlow(),
			onTogglePriorityLabels: () => this.togglePriorityLabels(),
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
		this.renderer = new RadarRenderer(this.svgContainer, this.radarData);

		// Create interactions handler
		this.interactions = new RadarInteractions(
			this.svgContainer,
			this.renderer.getSvgElement(),
			this.renderer.getBlipsGroup(),
			{
				onBlipMove: (blipId, r, theta) => this.onBlipMove(blipId, r, theta),
				onBlipClick: (blipId, event) => this.onBlipClick(blipId, event),
				onRadarContextMenu: (event) => this.onRadarContextMenu(event),
				onFileDrop: (event, r, theta) => this.onFileDrop(event, r, theta),
				onZoomChange: (zoom) => this.onZoomChange(zoom),
				onPanChange: (panX, panY) => this.onPanChange(panX, panY),
			}
		);

		this.renderer.setTransform(
			this.viewState.zoom,
			this.viewState.panX,
			this.viewState.panY
		);
		this.interactions.setZoom(this.viewState.zoom);
		this.interactions.setPan(this.viewState.panX, this.viewState.panY);
		this.renderer.setTitlesVisible(this.titlesVisible);
		this.renderer.setGlowVisible(this.glowVisible);
		this.renderer.setPriorityLabelsVisible(this.priorityLabelsVisible);
	}

	/**
	 * Handle blip click (not drag)
	 */
	private onBlipClick(blipId: string, event: MouseEvent | TouchEvent): void {
		const blip = this.radarData?.blips.find((b) => b.id === blipId);
		if (!blip) return;

		// Command+click (macOS) or Ctrl+click (Win/Linux)
		if (event instanceof MouseEvent && (event.metaKey || event.ctrlKey)) {
			if (blip.type === "note" && blip.notePath) {
				void this.app.workspace.openLinkText(blip.notePath, "", "tab");
			} else if (blip.type === "text") {
				void this.createNoteFromBlip(blip);
			}
			return;
		}

		const menu = new Menu();

		// If it's a note blip, offer to open the note
		if (blip.type === "note" && blip.notePath) {
			menu.addItem((item) =>
				item
					.setTitle("Open note")
					.setIcon("file")
					.onClick(() => {
						if (blip.notePath) {
							void this.app.workspace.openLinkText(blip.notePath, "", "tab");
						}
					})
			);
		}

		// If it's a text blip, offer to create a note from it
		if (blip.type === "text") {
			menu.addItem((item) =>
				item
					.setTitle("Create a note from this blip")
					.setIcon("file-plus")
					.onClick(() => void this.createNoteFromBlip(blip))
			);
		}

		menu.addItem((item) =>
			item
				.setTitle("Remove from radar")
				.setIcon("trash")
				.onClick(() => this.removeBlip(blipId))
		);

		// Handle both mouse and touch events for menu positioning
		if (event instanceof MouseEvent) {
			menu.showAtMouseEvent(event);
		} else {
			// For touch events, use the touch position
			const touch = event.changedTouches[0];
			if (touch) {
				menu.showAtPosition({ x: touch.clientX, y: touch.clientY });
			}
		}
	}

	/**
	 * Handle right-click on the radar background (not on a blip)
	 */
	private onRadarContextMenu(event: MouseEvent): void {
		const pos = this.interactions?.getRadarPosition(event.clientX, event.clientY);
		const menu = new Menu();

		menu.addItem((item) =>
			item
				.setTitle("Add note blip")
				.setIcon("file-plus")
				.onClick(() => this.openAddNoteModal(pos?.r, pos?.theta))
		);
		menu.addItem((item) =>
			item
				.setTitle("Add text blip")
				.setIcon("type-outline")
				.onClick(() => this.openAddTextModal(pos?.r, pos?.theta))
		);

		menu.addSeparator();

		menu.addItem((item) =>
			item
				.setTitle("Reset zoom")
				.setIcon("maximize")
				.onClick(() => this.resetZoom())
		);

		menu.addSeparator();

		menu.addItem((item) =>
			item
				.setTitle("Customize")
				.setIcon("settings")
				.onClick(() => this.openCustomizeModal())
		);

		menu.showAtMouseEvent(event);
	}

	/**
	 * Handle a file dropped from the file explorer onto the radar
	 */
	private onFileDrop(event: DragEvent, r: number, theta: number): void {
		if (!this.radarData) return;

		// Prefer Obsidian's internal drag manager (set when dragging from the file explorer).
		// DragManager is not part of the public API so we use a minimal local interface.
		interface ObsidianDragManager {
			draggable: { type: string; file?: unknown } | null;
		}
		const appWithDrag = this.app as unknown as { dragManager: ObsidianDragManager };
		const draggable = appWithDrag.dragManager?.draggable;

		let file: TFile | null = null;

		if (draggable?.type === "file" && draggable.file instanceof TFile) {
			file = draggable.file;
		} else {
			// Fall back to dataTransfer text/plain which contains the file path
			const path = event.dataTransfer?.getData("text/plain")?.trim();
			if (path) {
				const abstractFile = this.app.vault.getAbstractFileByPath(path);
				if (abstractFile instanceof TFile) {
					file = abstractFile;
				}
			}
		}

		if (!file) return;

		this.addBlip({
			type: "note",
			title: file.basename,
			notePath: file.path,
			r,
			theta,
		});
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
		this.viewState.zoom = zoom;
		this.renderer?.setZoom(zoom);
	}

	/**
	 * Handle pan change
	 */
	private onPanChange(panX: number, panY: number): void {
		this.viewState.panX = panX;
		this.viewState.panY = panY;
		this.renderer?.setPan(panX, panY);
	}

	/**
	 * Open modal to add a note blip
	 */
	private openAddNoteModal(r?: number, theta?: number): void {
		if (!this.radarData) return;

		const modal = new AddBlipModal(this.app, (notePath, title) => {
			this.addBlip({
				type: "note",
				title,
				notePath,
				r: r ?? 0.5,
				theta: theta ?? Math.random() * 360,
			});
		});
		modal.open();
	}

	/**
	 * Open modal to add a text blip
	 */
	private openAddTextModal(r?: number, theta?: number): void {
		if (!this.radarData) return;

		const modal = new AddTextModal(this.app, (title) => {
			this.addBlip({
				type: "text",
				title,
				r: r ?? 0.5,
				theta: theta ?? Math.random() * 360,
			});
		});
		modal.open();
	}

	/**
	 * Open the help modal
	 */
	private openHelpModal(): void {
		new HelpModal(this.app).open();
	}

	/**
	 * Open modal to customize priority levels and categories
	 */
	private openCustomizeModal(): void {
		if (!this.radarData) return;

		new CustomizeRadarModal(this.app, this.radarData, {
			onPrioritiesChanged: (levels) => {
				if (!this.radarData) return;
				this.plugin.radarStore.setPriorityLevels(this.radarData, levels);
				this.renderer?.updateData(this.radarData);
				this.requestSave();
			},
			onCategoriesChanged: (categories) => {
				if (!this.radarData) return;
				this.plugin.radarStore.setCategories(this.radarData, categories);
				this.renderer?.updateData(this.radarData);
				this.requestSave();
			},
			onBlipRadiusChanged: (blipRadius) => {
				if (!this.radarData) return;
				this.plugin.radarStore.setBlipRadius(this.radarData, blipRadius);
				this.renderer?.updateData(this.radarData);
				this.requestSave();
			},
			onBlipColorChanged: (color) => {
				if (!this.radarData) return;
				this.plugin.radarStore.setBlipColor(this.radarData, color);
				this.renderer?.updateData(this.radarData);
				this.requestSave();
			},
		}).open();
	}

	/**
	 * Revert note blips back to text blips when their linked note is deleted.
	 * Called by the plugin's vault delete handler for open views.
	 */
	revertNoteBlipToText(deletedPath: string): void {
		if (!this.radarData) return;

		let changed = false;

		for (const blip of this.radarData.blips) {
			if (blip.type === "note" && blip.notePath === deletedPath) {
				blip.type = "text";
				delete blip.notePath;
				changed = true;
			}
		}

		if (changed) {
			this.renderer?.updateData(this.radarData);
			this.requestSave();
		}
	}

	/**
	 * Update blip notePaths (and matching titles) when a vault file is renamed.
	 * Called by the plugin's vault rename handler for open views.
	 */
	updateBlipPaths(oldPath: string, newPath: string, newBasename: string): void {
		if (!this.radarData) return;

		const oldBasename = oldPath.split("/").pop()?.replace(/\.[^/.]+$/, "") ?? "";
		let changed = false;

		for (const blip of this.radarData.blips) {
			if (blip.notePath === oldPath) {
				blip.notePath = newPath;
				if (blip.title === oldBasename) blip.title = newBasename;
				changed = true;
			}
		}

		if (changed) {
			this.renderer?.updateData(this.radarData);
			this.requestSave();
		}
	}

	/**
	 * Add a blip to the radar
	 */
	private addBlip(blipData: Omit<Blip, "id">): void {
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
	 * Create a new note from a text blip and convert the blip to a note blip
	 */
	private async createNoteFromBlip(blip: Blip): Promise<void> {
		if (!this.radarData) return;

		const fileName = `${blip.title}.md`;
		let file: TFile;

		const existing = this.app.vault.getAbstractFileByPath(fileName);
		if (existing instanceof TFile) {
			file = existing;
		} else {
			try {
				file = await this.app.vault.create(fileName, "");
			} catch (error) {
				console.error("Failed to create note from blip:", error);
				return;
			}
		}

		await this.app.workspace.openLinkText(file.path, "", "tab");

		this.plugin.radarStore.updateBlip(this.radarData, blip.id, {
			type: "note",
			notePath: file.path,
		});

		this.renderer?.updateData(this.radarData);
		this.requestSave();
	}

	/**
	 * Public actions callable from commands
	 */
	addNoteBlip(): void {
		const pos = this.interactions?.getViewCenter();
		this.openAddNoteModal(pos?.r, pos?.theta);
	}

	addTextBlip(): void {
		const pos = this.interactions?.getViewCenter();
		this.openAddTextModal(pos?.r, pos?.theta);
	}

	toggleTitles(): void {
		this.titlesVisible = !this.titlesVisible;
		this.toolbar?.setTitlesVisible(this.titlesVisible);
		this.renderer?.setTitlesVisible(this.titlesVisible);
	}

	toggleGlow(): void {
		this.glowVisible = !this.glowVisible;
		this.toolbar?.setGlowVisible(this.glowVisible);
		this.renderer?.setGlowVisible(this.glowVisible);
	}

	togglePriorityLabels(): void {
		this.priorityLabelsVisible = !this.priorityLabelsVisible;
		this.toolbar?.setPriorityLabelsVisible(this.priorityLabelsVisible);
		this.renderer?.setPriorityLabelsVisible(this.priorityLabelsVisible);
	}

	zoomIn(): void {
		const newZoom = Math.min(
			this.viewState.zoom + SVG_CONFIG.zoomStep,
			SVG_CONFIG.maxZoom
		);
		this.onZoomChange(newZoom);
	}

	zoomOut(): void {
		const newZoom = Math.max(
			this.viewState.zoom - SVG_CONFIG.zoomStep,
			SVG_CONFIG.minZoom
		);
		this.onZoomChange(newZoom);
	}

	resetZoom(): void {
		// Reset both zoom and pan
		this.onZoomChange(DEFAULT_VIEW_STATE.zoom);
		this.onPanChange(DEFAULT_VIEW_STATE.panX, DEFAULT_VIEW_STATE.panY);
		this.interactions?.setZoom(DEFAULT_VIEW_STATE.zoom);
		this.interactions?.setPan(DEFAULT_VIEW_STATE.panX, DEFAULT_VIEW_STATE.panY);
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
