/**
 * Command Registration
 * Registers all plugin commands
 */

import type RadarPlugin from "../main";
import { createRadarCommand } from "./createRadar";

export function registerCommands(plugin: RadarPlugin): void {
	// Create new radar
	plugin.addCommand({
		id: "radar:create",
		name: "Create new radar",
		callback: () => createRadarCommand(plugin),
	});
}
