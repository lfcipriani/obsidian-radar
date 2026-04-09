/**
 * Customize Radar Modal
 * Modal for configuring priority levels and categories
 */

import { App, Modal, Setting } from "obsidian";
import type { RadarData, PriorityLevel, Category } from "../types";
import { generateId } from "../utils/idGenerator";
import { MAX_BLIP_RADIUS, MIN_BLIP_RADIUS } from "../constants";

const MAX_PRIORITY_LEVELS = 8;
const MAX_CATEGORIES = 8;
const MAX_CATEGORY_NAME_LENGTH = 35;
const MIN_PRIORITY_LEVELS = 1;
const MIN_CATEGORIES = 3;

export interface CustomizeRadarModalOptions {
	onPrioritiesChanged: (levels: PriorityLevel[]) => void;
	onCategoriesChanged: (categories: Category[]) => void;
	onBlipRadiusChanged: (blipRadius: number) => void;
}

export class CustomizeRadarModal extends Modal {
	private priorities: PriorityLevel[];
	private categories: Category[];
	private blipRadius: number;
	private options: CustomizeRadarModalOptions;

	constructor(
		app: App,
		radarData: RadarData,
		options: CustomizeRadarModalOptions
	) {
		super(app);
		// Work on deep copies so cancel doesn't affect live data
		this.priorities = radarData.priorityLevels.map((p) => ({ ...p }));
		this.categories = radarData.categories.map((c) => ({ ...c }));
		this.blipRadius = radarData.blipRadius;
		this.options = options;
	}

	onOpen(): void {
		this.contentEl.createEl("h2", { text: "Customize radar" });
		this.refresh();
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private refresh(): void {
		// Keep the h2, re-render the rest
		const h2 = this.contentEl.querySelector("h2");
		this.contentEl.empty();
		if (h2) this.contentEl.appendChild(h2);

		this.renderPrioritiesSection(this.contentEl);
		this.renderCategoriesSection(this.contentEl);
		this.renderBlipSection(this.contentEl);
	}

	private renderPrioritiesSection(container: HTMLElement): void {
		container.createEl("h3", { text: "Priority levels" });

		for (const priority of this.priorities) {
			new Setting(container)
				.addText((text) =>
					text
						.setValue(priority.name)
						.setPlaceholder("Level name")
						.onChange((value) => {
							priority.name = value;
							this.options.onPrioritiesChanged([...this.priorities]);
						})
				)
				.addExtraButton((btn) =>
					btn
						.setIcon("trash")
						.setTooltip("Remove level")
						.setDisabled(this.priorities.length <= MIN_PRIORITY_LEVELS)
						.onClick(() => {
							this.priorities = this.priorities.filter((p) => p.id !== priority.id);
							this.redistributePriorityRadii();
							this.options.onPrioritiesChanged([...this.priorities]);
							this.refresh();
						})
				);
		}

		new Setting(container).addButton((btn) =>
			btn
				.setButtonText("Add level")
				.setDisabled(this.priorities.length >= MAX_PRIORITY_LEVELS)
				.onClick(() => {
					this.priorities.push({ id: generateId(), name: "New level", maxRadius: 1 });
					this.redistributePriorityRadii();
					this.options.onPrioritiesChanged([...this.priorities]);
					this.refresh();
				})
		);
	}

	private renderCategoriesSection(container: HTMLElement): void {
		container.createEl("h3", { text: "Categories" });

		for (const category of this.categories) {
			new Setting(container)
				.addText((text) =>
					text
						.setValue(category.name)
						.setPlaceholder("Category name")
						.then((component) => {
							component.inputEl.maxLength = MAX_CATEGORY_NAME_LENGTH;
						})
						.onChange((value) => {
							const trimmedValue = value.slice(0, MAX_CATEGORY_NAME_LENGTH);
							category.name = trimmedValue;
							if (trimmedValue !== value) {
								text.setValue(trimmedValue);
							}
							this.options.onCategoriesChanged([...this.categories]);
						})
				)
				.addColorPicker((picker) => {
					if (category.color) picker.setValue(category.color);
					picker.onChange((value) => {
						category.color = value;
						this.options.onCategoriesChanged([...this.categories]);
					});
				})
				.addExtraButton((btn) =>
					btn
						.setIcon("rotate-ccw")
						.setTooltip("Clear category color")
						.onClick(() => {
							delete category.color;
							this.options.onCategoriesChanged([...this.categories]);
							this.refresh();
						})
				)
				.addExtraButton((btn) =>
					btn
						.setIcon("trash")
						.setTooltip("Remove category")
						.setDisabled(this.categories.length <= MIN_CATEGORIES)
						.onClick(() => {
							this.categories = this.categories.filter((c) => c.id !== category.id);
							this.redistributeCategoryAngles();
							this.options.onCategoriesChanged([...this.categories]);
							this.refresh();
						})
				);
		}

		new Setting(container).addButton((btn) =>
			btn
				.setButtonText("Add category")
				.setDisabled(this.categories.length >= MAX_CATEGORIES)
				.onClick(() => {
					this.categories.push({ id: generateId(), name: "", startAngle: 0 });
					this.redistributeCategoryAngles();
					this.options.onCategoriesChanged([...this.categories]);
					this.refresh();
				})
		);
	}

	private renderBlipSection(container: HTMLElement): void {
		container.createEl("h3", { text: "Blips" });

		new Setting(container)
			.setName("Blip size")
			.setDesc(`Radius of blip circles in pixels (${MIN_BLIP_RADIUS}-${MAX_BLIP_RADIUS})`)
			.addSlider((slider) =>
				slider
					.setLimits(MIN_BLIP_RADIUS, MAX_BLIP_RADIUS, 1)
					.setValue(this.blipRadius)
					.setDynamicTooltip()
					.onChange((value) => {
						this.blipRadius = value;
						this.options.onBlipRadiusChanged(value);
					})
			);
	}

	private redistributePriorityRadii(): void {
		const n = this.priorities.length;
		this.priorities.forEach((p, i) => {
			p.maxRadius = (i + 1) / n;
		});
	}

	private redistributeCategoryAngles(): void {
		const n = this.categories.length;
		if (n === 0) return;
		const step = 360 / n;
		this.categories.forEach((c, i) => {
			let angle = 90 - i * step;
			if (angle < 0) angle += 360;
			c.startAngle = angle;
		});
	}
}
