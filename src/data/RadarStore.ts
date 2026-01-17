/**
 * Radar Store
 * Handles persistence of radar data to JSON files in the vault
 */

import { App, TFile, TFolder } from "obsidian";
import type { RadarData, Blip } from "../types";
import {
	DEFAULT_PRIORITIES,
	DEFAULT_CATEGORIES,
	DEFAULT_VIEW_STATE,
	RADAR_FILE_EXTENSION,
} from "../constants";
import { generateId } from "../utils/idGenerator";

export class RadarStore {
	constructor(private app: App) {}

	/**
	 * Create a new radar with default configuration
	 */
	createNewRadarData(name: string): RadarData {
		const now = Date.now();
		return {
			id: generateId(),
			name,
			priorityLevels: [...DEFAULT_PRIORITIES],
			categories: [...DEFAULT_CATEGORIES],
			blips: [],
			viewState: { ...DEFAULT_VIEW_STATE },
			createdAt: now,
			updatedAt: now,
		};
	}

	/**
	 * Create a new radar file in the vault
	 */
	async createRadar(name: string, folder?: TFolder): Promise<TFile> {
		const radarData = this.createNewRadarData(name);
		const fileName = `${name}.${RADAR_FILE_EXTENSION}`;
		const basePath = folder ? folder.path : "";
		const path = basePath ? `${basePath}/${fileName}` : fileName;

		const content = JSON.stringify(radarData, null, 2);
		const file = await this.app.vault.create(path, content);
		return file;
	}

	/**
	 * Load radar data from a file
	 */
	async loadRadar(file: TFile): Promise<RadarData> {
		const content = await this.app.vault.read(file);
		const data = JSON.parse(content) as RadarData;
		return data;
	}

	/**
	 * Save radar data to a file
	 */
	async saveRadar(file: TFile, data: RadarData): Promise<void> {
		data.updatedAt = Date.now();
		const content = JSON.stringify(data, null, 2);
		await this.app.vault.modify(file, content);
	}

	/**
	 * Add a blip to the radar
	 */
	addBlip(radar: RadarData, blip: Omit<Blip, "id" | "createdAt" | "updatedAt">): Blip {
		const now = Date.now();
		const newBlip: Blip = {
			...blip,
			id: generateId(),
			createdAt: now,
			updatedAt: now,
		};
		radar.blips.push(newBlip);
		radar.updatedAt = now;
		return newBlip;
	}

	/**
	 * Update a blip's position
	 */
	updateBlipPosition(radar: RadarData, blipId: string, r: number, theta: number): void {
		const blip = radar.blips.find((b) => b.id === blipId);
		if (blip) {
			blip.r = r;
			blip.theta = theta;
			blip.updatedAt = Date.now();
			radar.updatedAt = Date.now();
		}
	}

	/**
	 * Update a blip's properties
	 */
	updateBlip(radar: RadarData, blipId: string, updates: Partial<Blip>): void {
		const blip = radar.blips.find((b) => b.id === blipId);
		if (blip) {
			Object.assign(blip, updates, { updatedAt: Date.now() });
			radar.updatedAt = Date.now();
		}
	}

	/**
	 * Remove a blip from the radar
	 */
	removeBlip(radar: RadarData, blipId: string): void {
		const index = radar.blips.findIndex((b) => b.id === blipId);
		if (index !== -1) {
			radar.blips.splice(index, 1);
			radar.updatedAt = Date.now();
		}
	}

	/**
	 * List all radar files in the vault
	 */
	listRadarFiles(): TFile[] {
		return this.app.vault.getFiles().filter((file) =>
			file.path.endsWith(`.${RADAR_FILE_EXTENSION}`)
		);
	}

	/**
	 * Check if a file is a radar file
	 */
	isRadarFile(file: TFile): boolean {
		return file.path.endsWith(`.${RADAR_FILE_EXTENSION}`);
	}
}
