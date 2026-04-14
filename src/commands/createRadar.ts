/**
 * Create Radar Command
 * Creates a new radar file and opens it directly (like creating a new note)
 */

import { TFolder } from "obsidian";
import type RadarPlugin from "../main";
import { VIEW_TYPE_RADAR } from "../constants";

/**
 * Generate a unique "Untitled" filename
 */
function getUntitledName(plugin: RadarPlugin): string {
	const baseName = "Untitled";

	// Get existing radar file names (without extension)
	const existingNames = plugin.radarStore.listRadarFiles()
		.map(f => f.basename);

	// Find first available name
	if (!existingNames.includes(baseName)) {
		return baseName;
	}

	let counter = 1;
	while (existingNames.includes(`${baseName} ${counter}`)) {
		counter++;
	}

	return `${baseName} ${counter}`;
}

export async function createRadarCommand(plugin: RadarPlugin): Promise<void> {
	// Get the active folder or use root
	const activeFile = plugin.app.workspace.getActiveFile();
	const folder = activeFile?.parent instanceof TFolder ? activeFile.parent : null;

	// Generate untitled name
	const name = getUntitledName(plugin);

	// Create the radar file
	const file = await plugin.radarStore.createRadar(name, folder ?? undefined);

	// Open the radar and auto-select the header title so the user can rename it
	// immediately — mirroring what Obsidian does when creating a new note.
	const leaf = plugin.app.workspace.getLeaf(false);
	if (!leaf) return;

	await leaf.setViewState({
		type: VIEW_TYPE_RADAR,
		state: { file: file.path },
	});

	// The header element becomes contenteditable asynchronously after setViewState,
	// so defer one tick before selecting it.
	setTimeout(() => {
		const titleEl = leaf.view.containerEl
			.closest(".workspace-leaf")
			?.querySelector<HTMLElement>(".view-header-title");
		if (titleEl) {
			titleEl.focus();
			const range = document.createRange();
			range.selectNodeContents(titleEl);
			const sel = window.getSelection();
			sel?.removeAllRanges();
			sel?.addRange(range);
		}
	}, 0);
}
