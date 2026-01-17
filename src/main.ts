/**
 * Radar Plugin
 * An Obsidian plugin for creating radar visualizations to track notes and items
 */

import { Plugin } from "obsidian";
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
		this.addRibbonIcon("target", "Create new radar", async () => {
			const { createRadarCommand } = await import("./commands/createRadar");
			await createRadarCommand(this);
		});
	}

	onunload(): void {
		// Clean up views
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_RADAR);
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
