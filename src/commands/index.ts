/**
 * Command Registration
 * Registers all plugin commands
 */

import type RadarPlugin from "../main";
import { createRadarCommand } from "./createRadar";
import { RadarView } from "../ui/RadarView";

export function registerCommands(plugin: RadarPlugin): void {
	// Create new radar
	plugin.addCommand({
		id: "radar:create",
		name: "Create new",
		callback: () => createRadarCommand(plugin),
	});

	// View-scoped commands — only active when a radar view is focused
	plugin.addCommand({
		id: "radar:add-note-blip",
		name: "Add note blip",
		checkCallback: (checking) => {
			const view = plugin.app.workspace.getActiveViewOfType(RadarView);
			if (!view) return false;
			if (!checking) view.addNoteBlip();
			return true;
		},
	});

	plugin.addCommand({
		id: "radar:add-text-blip",
		name: "Add text blip",
		checkCallback: (checking) => {
			const view = plugin.app.workspace.getActiveViewOfType(RadarView);
			if (!view) return false;
			if (!checking) view.addTextBlip();
			return true;
		},
	});

	plugin.addCommand({
		id: "radar:zoom-in",
		name: "Zoom in",
		checkCallback: (checking) => {
			const view = plugin.app.workspace.getActiveViewOfType(RadarView);
			if (!view) return false;
			if (!checking) view.zoomIn();
			return true;
		},
	});

	plugin.addCommand({
		id: "radar:zoom-out",
		name: "Zoom out",
		checkCallback: (checking) => {
			const view = plugin.app.workspace.getActiveViewOfType(RadarView);
			if (!view) return false;
			if (!checking) view.zoomOut();
			return true;
		},
	});

	plugin.addCommand({
		id: "radar:zoom-reset",
		name: "Reset zoom",
		checkCallback: (checking) => {
			const view = plugin.app.workspace.getActiveViewOfType(RadarView);
			if (!view) return false;
			if (!checking) view.resetZoom();
			return true;
		},
	});

	plugin.addCommand({
		id: "radar:toggle-titles",
		name: "Toggle titles",
		checkCallback: (checking) => {
			const view = plugin.app.workspace.getActiveViewOfType(RadarView);
			if (!view) return false;
			if (!checking) view.toggleTitles();
			return true;
		},
	});

	plugin.addCommand({
		id: "radar:toggle-glow",
		name: "Toggle glow",
		checkCallback: (checking) => {
			const view = plugin.app.workspace.getActiveViewOfType(RadarView);
			if (!view) return false;
			if (!checking) view.toggleGlow();
			return true;
		},
	});
}
