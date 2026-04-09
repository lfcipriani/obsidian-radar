/**
 * Add Text Modal
 * Modal for adding a text blip (not linked to a note)
 */

import { App, Modal, Setting } from "obsidian";

export class AddTextModal extends Modal {
	private title = "";
	private color = "";
	private onSubmit: (title: string, color?: string) => void;

	constructor(app: App, onSubmit: (title: string, color?: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen(): void {
		const { contentEl } = this;

		contentEl.createEl("h2", { text: "Add text to radar" });

		new Setting(contentEl)
			.setName("Title")
			.setDesc("Enter the text to display on the radar")
			.addText((text) =>
				text
					.setPlaceholder("Enter text...")
					.onChange((value) => {
						this.title = value;
					})
			);

		new Setting(contentEl)
			.setName("Color")
			.setDesc("Optional blip color")
			.addColorPicker((picker) =>
				picker.onChange((value) => {
					this.color = value;
				})
			);

		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("Add")
					.setCta()
					.onClick(() => {
						if (this.title.trim()) {
							this.close();
							this.onSubmit(this.title.trim(), this.color || undefined);
						}
					})
			)
			.addButton((btn) =>
				btn.setButtonText("Cancel").onClick(() => {
					this.close();
				})
			);
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}
