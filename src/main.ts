/**
 * Radar Plugin
 * An Obsidian plugin for creating radar visualizations to track notes and items
 */

import { Plugin, TFile, TFolder, TAbstractFile, WorkspaceLeaf, Menu } from "obsidian";
import { RadarPluginSettings, DEFAULT_SETTINGS, RadarSettingTab } from "./settings";
import { VIEW_TYPE_RADAR, RADAR_FILE_EXTENSION } from "./constants";
import { RadarView } from "./ui/RadarView";
import { RadarStore } from "./data/RadarStore";
import { registerCommands } from "./commands";

export default class RadarPlugin extends Plugin {
	settings: RadarPluginSettings;
	radarStore: RadarStore;

	async onload(): Promise<void> {
		await this.loadSettings();

		// Initialize radar store
		this.radarStore = new RadarStore(this.app);

		// Register the radar view
		this.registerView(VIEW_TYPE_RADAR, (leaf) => new RadarView(leaf, this));

		// Register file extension to open with radar view
		this.registerExtensions([RADAR_FILE_EXTENSION], VIEW_TYPE_RADAR);

		// Register commands
		registerCommands(this);

		// Add settings tab
		this.addSettingTab(new RadarSettingTab(this.app, this));

		// Add ribbon icon for quick access
		this.addRibbonIcon("radar", "Create new radar", async () => {
			const { createRadarCommand } = await import("./commands/createRadar");
			await createRadarCommand(this);
		});

		// Add "New Radar" to the file-explorer context menu
		this.registerEvent(
			this.app.workspace.on("file-menu", (menu: Menu, file: TAbstractFile, source: string) => {
				if (source !== "file-explorer-context-menu") return;

				const folder = file instanceof TFolder ? file : file.parent ?? undefined;

				menu.addItem((item) =>
					item
						.setSection('action-primary')
						.setTitle("New radar")
						.setIcon("radar")
						.onClick(() => {
							void (async () => {
								const { createRadarCommand } = await import("./commands/createRadar");
								await createRadarCommand(this, folder instanceof TFolder ? folder : undefined);
							})();
						})
				);
			})
		);

		// Keep note blip references in sync when files are renamed or moved
		this.registerEvent(
			this.app.vault.on("rename", (file, oldPath) => {
				this.handleFileRename(file, oldPath);
			})
		);

		// Revert note blips to text blips when their linked note is deleted
		this.registerEvent(
			this.app.vault.on("delete", (file) => {
				this.handleFileDelete(file);
			})
		);

		this.app.workspace.onLayoutReady(() => {
			void this.refreshOpenRadarLeaves();
		});
	}

	onunload(): void {
		for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_RADAR)) {
			leaf.detach();
		}
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<RadarPluginSettings>);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	private async refreshOpenRadarLeaves(): Promise<void> {
		const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_RADAR);

		for (const leaf of leaves) {
			const file = this.getLeafFile(leaf);
			if (!(file instanceof TFile) || file.extension !== RADAR_FILE_EXTENSION) {
				leaf.detach();
				continue;
			}

			await leaf.openFile(file, {
				active: leaf === this.app.workspace.getMostRecentLeaf(),
			});
		}
	}

	private getLeafFile(leaf: WorkspaceLeaf): TFile | null {
		const view = leaf.view as { file?: TFile | null };
		return view.file ?? null;
	}

	private handleFileRename(file: TAbstractFile, oldPath: string): void {
		if (!(file instanceof TFile)) return;

		const newPath = file.path;
		const newBasename = file.basename;
		const openRadarPaths = new Set<string>();

		// Update all open radar views in memory
		for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_RADAR)) {
			const view = leaf.view as RadarView;
			if (view.file?.path) openRadarPaths.add(view.file.path);
			view.updateBlipPaths(oldPath, newPath, newBasename);
		}

		// Update all closed radar files on disk
		void this.updateClosedRadarFiles(oldPath, newPath, newBasename, openRadarPaths);
	}

	private async updateClosedRadarFiles(
		oldPath: string,
		newPath: string,
		newBasename: string,
		skipPaths: Set<string>
	): Promise<void> {
		const oldBasename = oldPath.split("/").pop()?.replace(/\.[^/.]+$/, "") ?? "";

		for (const file of this.radarStore.listRadarFiles()) {
			if (skipPaths.has(file.path)) continue;

			try {
				const data = await this.radarStore.loadRadar(file);
				let changed = false;

				for (const blip of data.blips) {
					if (blip.notePath === oldPath) {
						blip.notePath = newPath;
						if (blip.title === oldBasename) blip.title = newBasename;
						changed = true;
					}
				}

				if (changed) {
					await this.radarStore.saveRadar(file, data);
				}
			} catch {
				// Skip files that can't be read or parsed
			}
		}
	}

	private handleFileDelete(file: TAbstractFile): void {
		if (!(file instanceof TFile)) return;

		const deletedPath = file.path;
		const openRadarPaths = new Set<string>();

		// Update all open radar views in memory
		for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_RADAR)) {
			const view = leaf.view as RadarView;
			if (view.file?.path) openRadarPaths.add(view.file.path);
			view.revertNoteBlipToText(deletedPath);
		}

		// Update all closed radar files on disk
		void this.revertDeletedNotesInClosedFiles(deletedPath, openRadarPaths);
	}

	private async revertDeletedNotesInClosedFiles(
		deletedPath: string,
		skipPaths: Set<string>
	): Promise<void> {
		for (const file of this.radarStore.listRadarFiles()) {
			if (skipPaths.has(file.path)) continue;

			try {
				const data = await this.radarStore.loadRadar(file);
				let changed = false;

				for (const blip of data.blips) {
					if (blip.type === "note" && blip.notePath === deletedPath) {
						blip.type = "text";
						delete blip.notePath;
						changed = true;
					}
				}

				if (changed) {
					await this.radarStore.saveRadar(file, data);
				}
			} catch {
				// Skip files that can't be read or parsed
			}
		}
	}
}
