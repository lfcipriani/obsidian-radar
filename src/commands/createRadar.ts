/**
 * Create Radar Command
 * Creates a new radar file and opens it directly (like creating a new note)
 */

import { TFolder } from "obsidian";
import type RadarPlugin from "../main";

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

	// Open the radar in the active leaf (like opening a new note)
	const leaf = plugin.app.workspace.getLeaf(false);
	if (leaf) {
		await leaf.openFile(file);
	}
}
