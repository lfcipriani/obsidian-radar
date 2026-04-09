/**
 * Add Blip Modal
 * Modal for selecting a note to add as a blip
 */

import { App, FuzzySuggestModal, TFile } from "obsidian";

export class AddBlipModal extends FuzzySuggestModal<TFile> {
	private selectedColor = "";
	private onSubmit: (notePath: string, title: string, color?: string) => void;

	constructor(app: App, onSubmit: (notePath: string, title: string, color?: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
		this.setPlaceholder("Search for a note to add to the radar...");
	}

	onOpen(): void {
		super.onOpen();
		const colorRow = this.modalEl.createDiv({ cls: "radar-color-row" });
		colorRow.createSpan({ text: "Color: " });
		const colorInput = colorRow.createEl("input", { attr: { type: "color" } });
		colorInput.addEventListener("input", () => {
			this.selectedColor = colorInput.value;
		});
		this.modalEl.insertBefore(colorRow, this.modalEl.firstChild);
	}

	getItems(): TFile[] {
		return this.app.vault.getMarkdownFiles();
	}

	getItemText(file: TFile): string {
		return file.basename;
	}

	onChooseItem(file: TFile, evt: MouseEvent | KeyboardEvent): void {
		this.onSubmit(file.path, file.basename, this.selectedColor || undefined);
	}
}
