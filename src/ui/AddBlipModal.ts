/**
 * Add Blip Modal
 * Modal for selecting a note to add as a blip
 */

import { App, FuzzySuggestModal, TFile } from "obsidian";

export class AddBlipModal extends FuzzySuggestModal<TFile> {
	private onSubmit: (notePath: string, title: string) => void;

	constructor(app: App, onSubmit: (notePath: string, title: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
		this.setPlaceholder("Search for a note to add to the radar...");
	}

	getItems(): TFile[] {
		return this.app.vault.getMarkdownFiles();
	}

	getItemText(file: TFile): string {
		return file.basename;
	}

	onChooseItem(file: TFile, evt: MouseEvent | KeyboardEvent): void {
		this.onSubmit(file.path, file.basename);
	}
}
