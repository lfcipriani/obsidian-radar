/**
 * Add Text Modal
 * Modal for adding a text blip (not linked to a note)
 */

import { App, Modal, Setting } from "obsidian";

export interface AddTextModalOptions {
	/** Pre-filled title text (used when renaming an existing blip) */
	initialTitle?: string;
	/** Modal heading text */
	heading?: string;
	/** Text for the confirm button */
	submitButtonText?: string;
}

export class AddTextModal extends Modal {
	private title: string;
	private onSubmit: (title: string) => void;
	private heading: string;
	private submitButtonText: string;

	constructor(app: App, onSubmit: (title: string) => void, options: AddTextModalOptions = {}) {
		super(app);
		this.onSubmit = onSubmit;
		this.title = options.initialTitle ?? "";
		this.heading = options.heading ?? "Add text to radar";
		this.submitButtonText = options.submitButtonText ?? "Add";
	}

	onOpen(): void {
		const { contentEl } = this;

		contentEl.createEl("h2", { text: this.heading });

		new Setting(contentEl)
			.setName("Title")
			.setDesc("Enter the text to display on the radar")
			.addText((text) => {
				text
					.setPlaceholder("Enter text...")
					.setValue(this.title)
					.onChange((value) => {
						this.title = value;
					});
				text.inputEl.addEventListener("keydown", (e) => {
					if (e.key === "Enter" && this.title.trim()) {
						e.preventDefault();
						this.close();
						this.onSubmit(this.title.trim());
					}
				});
			});

		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText(this.submitButtonText)
					.setCta()
					.onClick(() => {
						if (this.title.trim()) {
							this.close();
							this.onSubmit(this.title.trim());
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
