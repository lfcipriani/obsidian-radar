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

const PRESET_COLORS = [
	"#fb464c",
	"#e9973f",
	"#e0ac00",
	"#44cf6e",
	"#53dfdd",
	"#027aff",
	"#a882ff",
];
const MAX_PRIORITY_NAME_LENGTH = 15;
const MAX_CATEGORY_NAME_LENGTH = 35;
const MIN_PRIORITY_LEVELS = 1;
const MIN_CATEGORIES = 3;

export interface CustomizeRadarModalOptions {
	onPrioritiesChanged: (levels: PriorityLevel[]) => void;
	onCategoriesChanged: (categories: Category[]) => void;
	onBlipRadiusChanged: (blipRadius: number) => void;
	onBlipColorChanged: (color: string | undefined) => void;
}

export class CustomizeRadarModal extends Modal {
	private priorities: PriorityLevel[];
	private categories: Category[];
	private blipRadius: number;
	private blipColor: string | undefined;
	private options: CustomizeRadarModalOptions;

	constructor(
		app: App,
		radarData: RadarData,
		options: CustomizeRadarModalOptions
	) {
		super(app);
		// Work on deep copies so cancel doesn't affect live data
		this.priorities = radarData.priorityLevels.map((p) => ({ ...p }));
		this.categories = radarData.categories
			.map((c) => ({ ...c }))
			.sort((a, b) => (a.startAngle - 90 + 360) % 360 - (b.startAngle - 90 + 360) % 360);
		this.blipRadius = radarData.blipRadius;
		this.blipColor = radarData.blipColor;
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

		this.renderBlipSection(this.contentEl);
		this.renderCategoriesSection(this.contentEl);
		this.renderPrioritiesSection(this.contentEl);
	}

	private renderPrioritiesSection(container: HTMLElement): void {
		container.createEl("h3", { text: "Priority levels" });
		container.createEl("p", {
			text: "Concentric rings of the radar. The innermost ring is the highest priority; outer rings are lower. Moving or adding levels will keep the blips in their right priorities.",
			cls: "radar-modal-section-desc",
		});

		const rows: HTMLElement[] = [];

		for (const priority of this.priorities) {
			let resetBtnEl: HTMLElement | null = null;

			const s = new Setting(container)
				.addExtraButton((btn) => {
					btn.setIcon("grip-vertical").setTooltip("Drag to reorder");
					btn.extraSettingsEl.addClass("radar-drag-handle");
				})
				.addText((text) =>
					text
						.setValue(priority.name)
						.setPlaceholder("Level name")
						.then((component) => {
							component.inputEl.maxLength = MAX_PRIORITY_NAME_LENGTH;
						})
						.onChange((value) => {
							const trimmedValue = value.slice(0, MAX_PRIORITY_NAME_LENGTH);
							priority.name = trimmedValue;
							if (trimmedValue !== value) {
								text.setValue(trimmedValue);
							}
							this.options.onPrioritiesChanged([...this.priorities]);
						})
				)
				.addExtraButton((btn) => {
					resetBtnEl = btn.extraSettingsEl;
					btn
						.setIcon("rotate-ccw")
						.setTooltip("Clear priority color")
						.onClick(() => {
							delete priority.color;
							this.options.onPrioritiesChanged([...this.priorities]);
							this.refresh();
						});
				})
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

			const swatchContainer = s.controlEl.createEl("div", { cls: "radar-color-swatches" });
			this.fillColorSwatches(
				swatchContainer,
				priority.color,
				(color) => {
					priority.color = color;
					this.options.onPrioritiesChanged([...this.priorities]);
				},
				() => this.refresh()
			);
			if (resetBtnEl) {
				s.controlEl.insertBefore(swatchContainer, resetBtnEl);
			}

			rows.push(s.settingEl);
		}

		this.setupDragAndDrop(rows, (from, to) => {
			const moved = this.priorities.splice(from, 1)[0]!;
			this.priorities.splice(from < to ? to - 1 : to, 0, moved);
			this.redistributePriorityRadii();
			this.options.onPrioritiesChanged([...this.priorities]);
			this.refresh();
		});

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
		container.createEl("p", {
			text: "Segments that divide the radar. Moving or adding categories will keep the blips in their right category. Renderization starts at 90 degree angle and goes counter-clockwise.",
			cls: "radar-modal-section-desc",
		});

		const rows: HTMLElement[] = [];

		for (const category of this.categories) {
			let resetBtnEl: HTMLElement | null = null;

			const s = new Setting(container)
				.addExtraButton((btn) => {
					btn.setIcon("grip-vertical").setTooltip("Drag to reorder");
					btn.extraSettingsEl.addClass("radar-drag-handle");
				})
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
				.addExtraButton((btn) => {
					resetBtnEl = btn.extraSettingsEl;
					btn
						.setIcon("rotate-ccw")
						.setTooltip("Clear category color")
						.onClick(() => {
							delete category.color;
							this.options.onCategoriesChanged([...this.categories]);
							this.refresh();
						});
				})
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

			// Insert color swatches before the reset button
			const swatchContainer = s.controlEl.createEl("div", { cls: "radar-color-swatches" });
			this.fillColorSwatches(
				swatchContainer,
				category.color,
				(color) => {
					category.color = color;
					this.options.onCategoriesChanged([...this.categories]);
				},
				() => this.refresh()
			);
			if (resetBtnEl) {
				s.controlEl.insertBefore(swatchContainer, resetBtnEl);
			}

			rows.push(s.settingEl);
		}

		this.setupDragAndDrop(rows, (from, to) => {
			const moved = this.categories.splice(from, 1)[0]!;
			this.categories.splice(from < to ? to - 1 : to, 0, moved);
			this.redistributeCategoryAngles();
			this.options.onCategoriesChanged([...this.categories]);
			this.refresh();
		});

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
		container.createEl("p", {
			text: "Items placed on the radar. Each blip represents a note or a piece of text.",
			cls: "radar-modal-section-desc",
		});

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

		let resetBtnEl: HTMLElement | null = null;
		const colorSetting = new Setting(container)
			.setName("Blip color")
			.setDesc("Default color for all blips (uses accent color when unset)")
			.addExtraButton((btn) => {
				resetBtnEl = btn.extraSettingsEl;
				btn
					.setIcon("rotate-ccw")
					.setTooltip("Reset to accent color")
					.onClick(() => {
						this.blipColor = undefined;
						this.options.onBlipColorChanged(undefined);
						this.refresh();
					});
			});

		const swatchContainer = colorSetting.controlEl.createEl("div", { cls: "radar-color-swatches" });
		this.fillColorSwatches(
			swatchContainer,
			this.blipColor,
			(color) => {
				this.blipColor = color;
				this.options.onBlipColorChanged(color);
			},
			() => this.refresh()
		);
		if (resetBtnEl) {
			colorSetting.controlEl.insertBefore(swatchContainer, resetBtnEl);
		}
	}

	private fillColorSwatches(
		container: HTMLElement,
		currentColor: string | undefined,
		onChange: (color: string) => void,
		onCommit: () => void
	): void {
		const isCustom = currentColor !== undefined && !PRESET_COLORS.includes(currentColor);

		for (const colorVar of PRESET_COLORS) {
			const swatch = container.createEl("div", { cls: "radar-color-swatch" });
			swatch.style.background = colorVar;
			if (currentColor === colorVar) {
				swatch.addClass("radar-color-swatch--selected");
			}
			swatch.addEventListener("click", () => {
				onChange(colorVar);
				onCommit();
			});
		}

		// Custom color swatch — opens native color picker
		const customSwatch = container.createEl("div", { cls: "radar-color-swatch radar-color-swatch--custom" });
		if (isCustom) {
			customSwatch.addClass("radar-color-swatch--selected");
		}

		const colorInput = customSwatch.createEl("input", {
			cls: "radar-color-swatch-input",
			attr: { type: "color" },
		});
		if (isCustom && currentColor) {
			colorInput.value = currentColor;
		}

		colorInput.addEventListener("input", (e) => {
			onChange((e.target as HTMLInputElement).value);
		});
		colorInput.addEventListener("change", () => {
			onCommit();
		});

		customSwatch.addEventListener("click", (e) => {
			if (e.target !== colorInput) colorInput.click();
		});
	}

	private setupDragAndDrop(rows: HTMLElement[], onReorder: (from: number, to: number) => void): void {
		let dragSrcIndex: number | null = null;

		rows.forEach((row, i) => {
			row.draggable = true;

			row.addEventListener("dragstart", (e) => {
				dragSrcIndex = i;
				e.dataTransfer?.setData("text/plain", String(i));
				setTimeout(() => row.addClass("radar-drag-source"), 0);
			});

			row.addEventListener("dragend", () => {
				row.removeClass("radar-drag-source");
				rows.forEach((r) => r.removeClass("radar-drag-over"));
				dragSrcIndex = null;
			});

			row.addEventListener("dragenter", (e) => {
				e.preventDefault();
				if (dragSrcIndex !== null && dragSrcIndex !== i) {
					rows.forEach((r) => r.removeClass("radar-drag-over"));
					row.addClass("radar-drag-over");
				}
			});

			row.addEventListener("dragover", (e) => {
				e.preventDefault();
			});

			row.addEventListener("drop", (e) => {
				e.preventDefault();
				rows.forEach((r) => r.removeClass("radar-drag-over"));
				if (dragSrcIndex !== null && dragSrcIndex !== i) {
					onReorder(dragSrcIndex, i);
				}
			});
		});
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
			c.startAngle = (90 + i * step) % 360;
		});
	}
}
