/**
 * Radar Store
 * Handles persistence of radar data to JSON files in the vault
 */

import { App, TFile, TFolder } from "obsidian";
import type { RadarData, Blip, PriorityLevel, Category } from "../types";
import {
	DEFAULT_PRIORITIES,
	DEFAULT_CATEGORIES,
	DEFAULT_BLIP_RADIUS,
	MIN_BLIP_RADIUS,
	MAX_BLIP_RADIUS,
	DEFAULT_BLIP_FONT_SIZE,
	MIN_BLIP_FONT_SIZE,
	MAX_BLIP_FONT_SIZE,
	RADAR_FILE_EXTENSION,
	CSS_VAR_TO_HEX,
} from "../constants";
import { generateId } from "../utils/idGenerator";

export class RadarStore {
	constructor(private app: App) {}

	/**
	 * Create a new radar with default configuration
	 */
	createNewRadarData(): RadarData {
		return {
			priorityLevels: [...DEFAULT_PRIORITIES],
			categories: [...DEFAULT_CATEGORIES],
			blipRadius: DEFAULT_BLIP_RADIUS,
			blipFontSize: DEFAULT_BLIP_FONT_SIZE,
			blips: [],
		};
	}

	/**
	 * Create a new radar file in the vault
	 */
	async createRadar(name: string, folder?: TFolder): Promise<TFile> {
		const radarData = this.createNewRadarData();
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
		const data = JSON.parse(content) as Partial<RadarData>;
		return this.normalizeRadarData(data);
	}

	/**
	 * Save radar data to a file
	 */
	async saveRadar(file: TFile, data: RadarData): Promise<void> {
		const content = JSON.stringify(data, null, 2);
		await this.app.vault.modify(file, content);
	}

	normalizeRadarData(data: Partial<RadarData>): RadarData {
		const categories = (data.categories ?? [...DEFAULT_CATEGORIES])
			.slice()
			.map((c) => ({ ...c, color: this.normalizeColor(c.color) }))
			.sort((a, b) => (a.startAngle - 90 + 360) % 360 - (b.startAngle - 90 + 360) % 360);
		const priorityLevels = (data.priorityLevels ?? [...DEFAULT_PRIORITIES])
			.map((p) => ({ ...p, color: this.normalizeColor(p.color) }));
		return {
			priorityLevels,
			categories,
			blipRadius: this.normalizeBlipRadius(data.blipRadius),
			blipFontSize: this.normalizeBlipFontSize(data.blipFontSize),
			blipColor: this.normalizeColor(data.blipColor),
			blips: (data.blips ?? []).map((b) => ({ ...b, color: this.normalizeColor(b.color) })),
		};
	}

	private normalizeColor(color: string | undefined): string | undefined {
		if (!color) return undefined;
		return CSS_VAR_TO_HEX[color] ?? color;
	}

	/**
	 * Add a blip to the radar
	 */
	addBlip(radar: RadarData, blip: Omit<Blip, "id">): Blip {
		const newBlip: Blip = {
			...blip,
			id: generateId(),
		};
		radar.blips.push(newBlip);
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
		}
	}

	/**
	 * Update a blip's properties
	 */
	updateBlip(radar: RadarData, blipId: string, updates: Partial<Blip>): void {
		const blip = radar.blips.find((b) => b.id === blipId);
		if (blip) {
			Object.assign(blip, updates);
		}
	}

	/**
	 * Remove a blip from the radar
	 */
	removeBlip(radar: RadarData, blipId: string): void {
		const index = radar.blips.findIndex((b) => b.id === blipId);
		if (index !== -1) {
			radar.blips.splice(index, 1);
		}
	}

	/**
	 * Replace all priority levels
	 */
	setPriorityLevels(radar: RadarData, levels: PriorityLevel[]): void {
		radar.priorityLevels = levels;
	}

	/**
	 * Replace all categories
	 */
	setCategories(radar: RadarData, categories: Category[]): void {
		radar.categories = categories;
	}

	/**
	 * Update the radar's blip radius
	 */
	setBlipRadius(radar: RadarData, blipRadius: number): void {
		radar.blipRadius = this.normalizeBlipRadius(blipRadius);
	}

	/**
	 * Update the radar's blip font size
	 */
	setBlipFontSize(radar: RadarData, blipFontSize: number): void {
		radar.blipFontSize = this.normalizeBlipFontSize(blipFontSize);
	}

	/**
	 * Update the radar's default blip color
	 */
	setBlipColor(radar: RadarData, color: string | undefined): void {
		radar.blipColor = color;
	}

	private normalizeBlipRadius(blipRadius: number | undefined): number {
		if (typeof blipRadius !== "number" || Number.isNaN(blipRadius)) {
			return DEFAULT_BLIP_RADIUS;
		}
		return Math.max(MIN_BLIP_RADIUS, Math.min(MAX_BLIP_RADIUS, blipRadius));
	}

	private normalizeBlipFontSize(blipFontSize: number | undefined): number {
		if (typeof blipFontSize !== "number" || Number.isNaN(blipFontSize)) {
			return DEFAULT_BLIP_FONT_SIZE;
		}
		return Math.max(MIN_BLIP_FONT_SIZE, Math.min(MAX_BLIP_FONT_SIZE, blipFontSize));
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
