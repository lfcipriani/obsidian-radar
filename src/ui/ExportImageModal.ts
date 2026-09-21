/**
 * Export Image Modal
 * Prompts for a file name when exporting the radar as a PNG image
 */

import { App, Modal, Setting } from "obsidian";

export class ExportImageModal extends Modal {
	private fileName: string;
	private onSubmit: (fileName: string) => void;

	constructor(app: App, defaultFileName: string, onSubmit: (fileName: string) => void) {
		super(app);
		this.fileName = defaultFileName;
		this.onSubmit = onSubmit;
	}

	onOpen(): void {
		const { contentEl } = this;

		contentEl.createEl("h2", { text: "Export radar as image" });

		new Setting(contentEl)
			.setName("File name")
			.setDesc("Saved as a PNG in the same folder as this radar")
			.addText((text) => {
				text
					.setValue(this.fileName)
					.onChange((value) => {
						this.fileName = value;
					});
				text.inputEl.addEventListener("keydown", (e) => {
					if (e.key === "Enter" && this.fileName.trim()) {
						e.preventDefault();
						this.close();
						this.onSubmit(this.fileName.trim());
					}
				});
				text.inputEl.focus();
				text.inputEl.select();
			});

		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("Export")
					.setCta()
					.onClick(() => {
						if (this.fileName.trim()) {
							this.close();
							this.onSubmit(this.fileName.trim());
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
