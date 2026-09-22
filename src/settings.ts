/**
 * Radar Plugin Settings
 * Settings interface and settings tab
 */

import { App, PluginSettingTab, Setting } from "obsidian";
import type { SettingDefinitionItem } from "obsidian";
import type RadarPlugin from "./main";
import type { RadarPluginSettings } from "./types";

export type { RadarPluginSettings } from "./types";

export const DEFAULT_SETTINGS: RadarPluginSettings = {
	defaultPriorityCount: 4,
	defaultCategoryCount: 4,
};

export class RadarSettingTab extends PluginSettingTab {
	plugin: RadarPlugin;

	constructor(app: App, plugin: RadarPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	// Declarative settings API (Obsidian >= 1.13.0). Falls back to display()
	// below on older Obsidian versions, which is unaware of this method.
	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				name: "Default priority levels",
				desc: "Number of priority rings for new radars (1-8)",
				control: {
					type: "slider",
					key: "defaultPriorityCount",
					min: 1,
					max: 8,
					step: 1,
					defaultValue: DEFAULT_SETTINGS.defaultPriorityCount,
				},
			},
			{
				name: "Default categories",
				desc: "Number of category segments for new radars (3-8)",
				control: {
					type: "slider",
					key: "defaultCategoryCount",
					min: 3,
					max: 8,
					step: 1,
					defaultValue: DEFAULT_SETTINGS.defaultCategoryCount,
				},
			},
		];
	}

	/** @deprecated Kept for Obsidian < 1.13.0; see getSettingDefinitions(). */
	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Default priority levels")
			.setDesc("Number of priority rings for new radars (1-8)")
			.addSlider((slider) =>
				slider
					.setLimits(1, 8, 1)
					.setValue(this.plugin.settings.defaultPriorityCount)
					.onChange(async (value) => {
						this.plugin.settings.defaultPriorityCount = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Default categories")
			.setDesc("Number of category segments for new radars (3-8)")
			.addSlider((slider) =>
				slider
					.setLimits(3, 8, 1)
					.setValue(this.plugin.settings.defaultCategoryCount)
					.onChange(async (value) => {
						this.plugin.settings.defaultCategoryCount = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
