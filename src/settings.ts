/**
 * Radar Plugin Settings
 * Settings interface and settings tab
 */

import { App, PluginSettingTab, Setting } from "obsidian";
import type RadarPlugin from "./main";
import type { RadarPluginSettings } from "./types";

export type { RadarPluginSettings } from "./types";

export const DEFAULT_SETTINGS: RadarPluginSettings = {
	defaultPriorityCount: 4,
	defaultCategoryCount: 4,
	blipRadius: 10,
};

export class RadarSettingTab extends PluginSettingTab {
	plugin: RadarPlugin;

	constructor(app: App, plugin: RadarPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Default priority levels")
			.setDesc("Number of priority rings for new radars (1-7)")
			.addSlider((slider) =>
				slider
					.setLimits(1, 7, 1)
					.setValue(this.plugin.settings.defaultPriorityCount)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.defaultPriorityCount = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Default categories")
			.setDesc("Number of category segments for new radars (0-8)")
			.addSlider((slider) =>
				slider
					.setLimits(0, 8, 1)
					.setValue(this.plugin.settings.defaultCategoryCount)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.defaultCategoryCount = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Blip size")
			.setDesc("Radius of blip circles in pixels (5-20)")
			.addSlider((slider) =>
				slider
					.setLimits(5, 20, 1)
					.setValue(this.plugin.settings.blipRadius)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.blipRadius = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
