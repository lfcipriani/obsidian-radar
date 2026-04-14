/**
 * Edit Blip Color Modal
 * Modal for changing or clearing a blip's color
 */

import { App, Modal, Setting } from "obsidian";
import { fillColorSwatches } from "../utils/colorSwatches";

export class EditBlipColorModal extends Modal {
	private color: string | undefined;
	private onSubmit: (color: string | undefined) => void;

	constructor(
		app: App,
		initialColor: string | undefined,
		onSubmit: (color: string | undefined) => void
	) {
		super(app);
		this.color = initialColor;
		this.onSubmit = onSubmit;
	}

	onOpen(): void {
		const { contentEl } = this;

		let resetBtnEl: HTMLElement | null = null;
		const colorSetting = new Setting(contentEl)
			.setName("Color")
			.setDesc("Override color for this blip (uses radar default when unset)")
			.addExtraButton((btn) => {
				resetBtnEl = btn.extraSettingsEl;
				btn
					.setIcon("rotate-ccw")
					.setTooltip("Clear blip color")
					.onClick(() => {
						this.color = undefined;
						this.onSubmit(undefined);
						this.close();
					});
			});

		const swatchContainer = colorSetting.controlEl.createEl("div", { cls: "radar-color-swatches" });
		fillColorSwatches(
			swatchContainer,
			this.color,
			(color) => { this.color = color; },
			() => {
				this.onSubmit(this.color);
				this.close();
			}
		);
		if (resetBtnEl) {
			colorSetting.controlEl.insertBefore(swatchContainer, resetBtnEl);
		}
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
