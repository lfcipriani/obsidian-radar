/**
 * Backlink helpers
 * Finds which note blips are connected by a link in the vault
 */

import type { Blip } from "../types";

/** Vault link map as exposed by Obsidian's `metadataCache.resolvedLinks` */
export type ResolvedLinks = Record<string, Record<string, number>>;

/** A pair of blip IDs connected by a link (in either direction) */
export type BlipLink = [string, string];

/**
 * Return every pair of note blips whose notes link to each other
 * (in either direction). Each pair is reported once.
 */
export function findBlipLinks(blips: Blip[], resolvedLinks: ResolvedLinks): BlipLink[] {
	const noteBlips = blips.filter((b) => b.type === "note" && b.notePath);
	const links: BlipLink[] = [];

	for (let i = 0; i < noteBlips.length; i++) {
		const a = noteBlips[i]!;
		for (let j = i + 1; j < noteBlips.length; j++) {
			const b = noteBlips[j]!;
			if (a.notePath === b.notePath) continue;
			if (resolvedLinks[a.notePath!]?.[b.notePath!] || resolvedLinks[b.notePath!]?.[a.notePath!]) {
				links.push([a.id, b.id]);
			}
		}
	}

	return links;
}
