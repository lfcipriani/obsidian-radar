/**
 * Help Modal
 * Quick reference for radar interactions
 */

import { App, Modal, Platform } from "obsidian";

export class HelpModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen(): void {
		const { contentEl } = this;
		const mod = Platform.isMacOS ? "CMD" : "Ctrl";

		contentEl.createEl("h2", { text: "Radar Help" });

		// Note Blips
		contentEl.createEl("h3", { text: "Note Blips" });
		const noteList = contentEl.createEl("ul");
		noteList.createEl("li", { text: "Add: drag a note from the sidebar, toolbar button or right-click on the radar" });
		noteList.createEl("li", { text: `Open note: ${mod}+click on the blip` });
		noteList.createEl("li", { text: "Remove: right-click the blip → Remove from radar" });

		// Text Blips
		contentEl.createEl("h3", { text: "Text Blips" });
		const textList = contentEl.createEl("ul");
		textList.createEl("li", { text: "Add: toolbar button or right-click on the radar" });
		textList.createEl("li", { text: `Create note from blip: ${mod}+click or right-click → Create a note from this blip` });
		textList.createEl("li", { text: "Remove: right-click the blip → Remove from radar" });
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
