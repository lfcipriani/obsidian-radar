/**
 * Edit Blip Color Modal
 * Modal for changing or clearing a blip's color
 */

import { App, Modal, Setting } from "obsidian";

export class EditBlipColorModal extends Modal {
	private color: string;
	private onSubmit: (color: string | undefined) => void;

	constructor(
		app: App,
		initialColor: string | undefined,
		onSubmit: (color: string | undefined) => void
	) {
		super(app);
		this.color = initialColor ?? "#6c8ebf";
		this.onSubmit = onSubmit;
	}

	onOpen(): void {
		const { contentEl } = this;

		contentEl.createEl("h2", { text: "Edit blip color" });

		new Setting(contentEl)
			.setName("Color")
			.addColorPicker((picker) =>
				picker.setValue(this.color).onChange((value) => {
					this.color = value;
				})
			);

		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("Save")
					.setCta()
					.onClick(() => {
						this.close();
						this.onSubmit(this.color);
					})
			)
			.addButton((btn) =>
				btn.setButtonText("Clear color").onClick(() => {
					this.close();
					this.onSubmit(undefined);
				})
			)
			.addButton((btn) =>
				btn.setButtonText("Cancel").onClick(() => {
					this.close();
				})
			);
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
