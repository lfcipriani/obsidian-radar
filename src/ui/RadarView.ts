/**
 * Radar View
 * TextFileView subclass for displaying and interacting with a radar
 */

import { TextFileView, WorkspaceLeaf, Menu, TFile, normalizePath, Notice } from "obsidian";
import type RadarPlugin from "../main";
import type { RadarData, Blip, ViewState, TitleMode } from "../types";
import { VIEW_TYPE_RADAR, SVG_CONFIG, DEFAULT_VIEW_STATE } from "../constants";
import { RadarRenderer } from "./RadarRenderer";
import { RadarToolbar } from "./RadarToolbar";
import { BlipActionBar, type BlipAction } from "./BlipActionBar";
import { RadarInteractions } from "./RadarInteractions";
import { AddBlipModal } from "./AddBlipModal";
import { AddTextModal } from "./AddTextModal";
import { CustomizeRadarModal } from "./CustomizeRadarModal";
import { HelpModal } from "./HelpModal";
import { ExportImageModal } from "./ExportImageModal";
import { rotateBlipsWithCategories, repositionBlipsWithPriorities } from "../utils/polarCoordinates";

export class RadarView extends TextFileView {
	private plugin: RadarPlugin;
	private radarData: RadarData | null = null;
	private viewState: ViewState = { ...DEFAULT_VIEW_STATE };
	private titleMode: TitleMode = "crop";
	private glowVisible = true;
	private priorityLabelsVisible = true;
	private renderer: RadarRenderer | null = null;
	private toolbar: RadarToolbar | null = null;
	private blipActionBar: BlipActionBar | null = null;
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
		this.blipActionBar?.hide();
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
		await super.onOpen();
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

		// Quick-action bar shown above a blip on single click
		this.blipActionBar = new BlipActionBar(this.mainContainer);

		// Dismiss the action bar on any press outside it, or on Escape.
		// pointerdown covers mouse and touch; the radar prevents default on
		// touchstart, which suppresses the compatibility mousedown on mobile.
		this.registerDomEvent(activeDocument, "pointerdown", (e) => {
			if (!this.blipActionBar?.contains(e.target)) {
				this.blipActionBar?.hide();
			}
		}, { capture: true });
		this.registerDomEvent(activeDocument, "keydown", (e) => {
			if (e.key === "Escape") {
				this.blipActionBar?.hide();
			}
		});
	}

	async onClose(): Promise<void> {
		this.clear();
		this.toolbar = null;
		this.blipActionBar = null;
		await super.onClose();
	}

	/**
	 * Add "Export as image" to the view's more-options (tab three-dot) menu
	 */
	onPaneMenu(menu: Menu, source: string): void {
		super.onPaneMenu(menu, source);

		menu.addItem((item) =>
			item
				.setTitle("Export as image")
				.setIcon("image")
				.onClick(() => this.exportAsImage())
		);
	}

	/**
	 * Called by Obsidian when the file backing this view is renamed.
	 * Required to avoid a console error from TextFileView.
	 */
	handleRename(newPath: string, _oldPath: string): void {
		if (this.file?.path === newPath) {
			// getDisplayText() already reads from this.file, which Obsidian
			// has already updated before calling handleRename, so nothing extra
			// is needed here — the header title refreshes automatically.
		}
	}

	/**
	 * Render the radar visualization
	 */
	private renderRadar(): void {
		if (!this.radarData || !this.svgContainer) return;

		this.blipActionBar?.hide();

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
				onBlipModifierClick: (blipId) => this.onBlipModifierClick(blipId),
				onBlipSingleClick: (blipId) => this.onBlipSingleClick(blipId),
				onBlipDoubleClick: (blipId) => this.onBlipDoubleClick(blipId),
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
		this.renderer.setTitleMode(this.titleMode);
		this.toolbar?.setTitleMode(this.titleMode);
		this.renderer.setGlowVisible(this.glowVisible);
		this.renderer.setPriorityLabelsVisible(this.priorityLabelsVisible);
	}

	/**
	 * Handle Cmd+click (macOS) or Ctrl+click (Win/Linux) on a blip:
	 * open note blips, create a note from text blips
	 */
	private onBlipModifierClick(blipId: string): void {
		const blip = this.radarData?.blips.find((b) => b.id === blipId);
		if (!blip) return;

		if (blip.type === "note" && blip.notePath) {
			void this.app.workspace.openLinkText(blip.notePath, "", "tab");
		} else if (blip.type === "text") {
			void this.createNoteFromBlip(blip);
		}
	}

	/**
	 * Handle a plain single click on a blip: show its quick-action bar.
	 */
	private onBlipSingleClick(blipId: string): void {
		const blip = this.radarData?.blips.find((b) => b.id === blipId);
		if (!blip) return;

		const dot = this.renderer
			?.getBlipsGroup()
			.querySelector(`[data-blip-id="${blipId}"] .radar-blip-dot`);
		if (!dot) return;

		const typeActions: BlipAction[] = [];
		if (blip.type === "note" && blip.notePath) {
			typeActions.push({
				icon: "file",
				tooltip: "Open note",
				onClick: () => this.openBlipNote(blipId),
			});
		} else if (blip.type === "text") {
			typeActions.push(
				{
					icon: "file-plus",
					tooltip: "Create a note from this blip",
					onClick: () => void this.createNoteFromBlip(blip),
				},
				{
					icon: "pencil",
					tooltip: "Rename",
					onClick: () => this.openRenameTextModal(blipId, blip.title),
				}
			);
		}

		this.blipActionBar?.show(blipId, dot, [
			...typeActions,
			{
				icon: "palette",
				tooltip: "Edit color",
				currentColor: blip.color,
				onPick: (color) => this.setBlipColor(blipId, color),
			},
			{
				icon: "trash",
				tooltip: "Remove from radar",
				onClick: () => this.removeBlip(blipId),
			},
		]);
	}

	/**
	 * Open the note linked to a note blip in a new tab
	 */
	private openBlipNote(blipId: string): void {
		const blip = this.radarData?.blips.find((b) => b.id === blipId);
		if (blip?.type === "note" && blip.notePath) {
			void this.app.workspace.openLinkText(blip.notePath, "", "tab");
		}
	}

	/**
	 * Set or clear a blip's color override
	 */
	private setBlipColor(blipId: string, color: string | undefined): void {
		if (!this.radarData) return;

		this.plugin.radarStore.updateBlip(this.radarData, blipId, { color });
		this.renderer?.updateData(this.radarData);
		this.requestSave();
	}

	/**
	 * Handle blip double-click: open note blips in a new tab, rename text blips
	 */
	private onBlipDoubleClick(blipId: string): void {
		this.blipActionBar?.hide();

		const blip = this.radarData?.blips.find((b) => b.id === blipId);
		if (!blip) return;

		if (blip.type === "note" && blip.notePath) {
			void this.app.workspace.openLinkText(blip.notePath, "", "tab");
		} else if (blip.type === "text") {
			this.openRenameTextModal(blipId, blip.title);
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

		this.blipActionBar?.hide();

		this.plugin.radarStore.updateBlipPosition(this.radarData, blipId, r, theta);
		this.requestSave();
	}

	/**
	 * Handle zoom change
	 */
	private onZoomChange(zoom: number): void {
		this.viewState.zoom = zoom;
		this.blipActionBar?.hide();
		this.renderer?.setZoom(zoom);
	}

	/**
	 * Handle pan change
	 */
	private onPanChange(panX: number, panY: number): void {
		this.viewState.panX = panX;
		this.viewState.panY = panY;
		this.blipActionBar?.hide();
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
	 * Open modal to rename an existing text blip
	 */
	private openRenameTextModal(blipId: string, currentTitle: string): void {
		if (!this.radarData) return;

		const modal = new AddTextModal(
			this.app,
			(title) => {
				if (!this.radarData) return;
				this.plugin.radarStore.updateBlip(this.radarData, blipId, { title });
				this.renderer?.updateData(this.radarData);
				this.requestSave();
			},
			{
				initialTitle: currentTitle,
				heading: "Rename text blip",
				submitButtonText: "Rename",
			}
		);
		modal.open();
	}

	/**
	 * Export the radar as a PNG image, prompting for a file name and saving
	 * it in the vault, in the same folder as this radar file
	 */
	private exportAsImage(): void {
		if (!this.radarData || !this.renderer || !this.file) return;

		const defaultFileName = `${this.file.basename}.png`;

		new ExportImageModal(this.app, defaultFileName, (fileName) => {
			void this.saveExportedImage(fileName);
		}).open();
	}

	/**
	 * Render the radar to PNG and write it into the vault next to this radar file
	 */
	private async saveExportedImage(fileName: string): Promise<void> {
		if (!this.renderer || !this.file) return;

		const name = fileName.toLowerCase().endsWith(".png") ? fileName : `${fileName}.png`;
		const folder = this.file.parent?.path ?? "";
		const path = normalizePath(folder ? `${folder}/${name}` : name);

		let blob: Blob;
		try {
			blob = await this.renderer.exportAsPngBlob();
		} catch (error) {
			console.error("Failed to render radar as image:", error);
			new Notice("Failed to export radar as image.");
			return;
		}

		try {
			const arrayBuffer = await blob.arrayBuffer();
			const existing = this.app.vault.getAbstractFileByPath(path);
			if (existing instanceof TFile) {
				await this.app.vault.modifyBinary(existing, arrayBuffer);
			} else {
				await this.app.vault.createBinary(path, arrayBuffer);
			}
			new Notice(`Exported radar image to ${path}`);
		} catch (error) {
			console.error("Failed to save radar image:", error);
			new Notice("Failed to save radar image.");
		}
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
				repositionBlipsWithPriorities(this.radarData.blips, this.radarData.priorityLevels, levels);
				this.plugin.radarStore.setPriorityLevels(this.radarData, levels);
				this.renderer?.updateData(this.radarData);
				this.requestSave();
			},
			onCategoriesChanged: (categories) => {
				if (!this.radarData) return;
				rotateBlipsWithCategories(this.radarData.blips, this.radarData.categories, categories);
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
			onBlipFontSizeChanged: (blipFontSize) => {
				if (!this.radarData) return;
				this.plugin.radarStore.setBlipFontSize(this.radarData, blipFontSize);
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
			this.blipActionBar?.hide();
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

		if (this.blipActionBar?.isShownFor(blipId)) {
			this.blipActionBar.hide();
		}
		this.plugin.radarStore.removeBlip(this.radarData, blipId);
		this.renderer?.removeBlip(blipId);
		this.requestSave();
	}

	/**
	 * Create a new note from a text blip and convert the blip to a note blip
	 */
	private async createNoteFromBlip(blip: Blip): Promise<void> {
		if (!this.radarData) return;

		const fileName = normalizePath(`${blip.title}.md`);
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
		if (this.titleMode === "crop") {
			this.titleMode = "hidden";
		} else if (this.titleMode === "hidden") {
			this.titleMode = "full";
		} else {
			this.titleMode = "crop";
		}
		this.toolbar?.setTitleMode(this.titleMode);
		this.renderer?.setTitleMode(this.titleMode);
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
