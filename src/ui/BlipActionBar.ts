/**
 * Blip Action Bar
 * Floating button bar shown above a blip after a single click
 */

import { setIcon, setTooltip } from "obsidian";
import { fillColorSwatches } from "../utils/colorSwatches";

interface BlipActionBase {
	icon: string;
	tooltip: string;
}

/** Button that runs an action and closes the bar */
export interface BlipButtonAction extends BlipActionBase {
	onClick: () => void;
}

/** Button that toggles a color swatch panel below the bar */
export interface BlipColorAction extends BlipActionBase {
	currentColor: string | undefined;
	/** Called with the picked color, or undefined when the color is cleared */
	onPick: (color: string | undefined) => void;
}

export type BlipAction = BlipButtonAction | BlipColorAction;

// Vertical gap in pixels between the blip dot and the bar
const BAR_OFFSET = 8;

export class BlipActionBar {
	private host: HTMLElement;
	private barEl: HTMLElement | null = null;
	private swatchPanelEl: HTMLElement | null = null;
	private anchor: Element | null = null;
	private blipId: string | null = null;

	/**
	 * @param host Positioned element the bar is placed in (coordinates are relative to it)
	 */
	constructor(host: HTMLElement) {
		this.host = host;
	}

	/**
	 * Show the bar above the given blip dot, replacing any bar already shown
	 */
	show(blipId: string, anchor: Element, actions: BlipAction[]): void {
		this.hide();

		const bar = this.host.createDiv({ cls: "radar-blip-actions" });
		const buttons = bar.createDiv({ cls: "radar-controls-group radar-blip-actions-buttons" });
		for (const action of actions) {
			const btn = buttons.createEl("button", { cls: "radar-control-btn" });
			setIcon(btn, action.icon);
			setTooltip(btn, action.tooltip, { placement: "top", delay: 500 });
			btn.addEventListener("click", () => {
				if ("onPick" in action) {
					this.toggleSwatchPanel(action);
				} else {
					this.hide();
					action.onClick();
				}
			});
		}

		this.barEl = bar;
		this.anchor = anchor;
		this.blipId = blipId;
		this.position(anchor);
	}

	/**
	 * Show or hide the color swatches below the buttons. Picking or clearing
	 * a color applies it and closes the bar.
	 */
	private toggleSwatchPanel(action: BlipColorAction): void {
		if (!this.barEl) return;

		if (this.swatchPanelEl) {
			this.swatchPanelEl.remove();
			this.swatchPanelEl = null;
		} else {
			const panel = this.barEl.createDiv({
				cls: "radar-controls-group radar-color-swatches radar-blip-actions-swatches",
			});
			let picked = action.currentColor;
			fillColorSwatches(
				panel,
				action.currentColor,
				(color) => { picked = color; },
				() => {
					this.hide();
					if (picked) action.onPick(picked);
				}
			);

			const resetBtn = panel.createEl("button", { cls: "radar-control-btn radar-blip-actions-reset" });
			setIcon(resetBtn, "rotate-ccw");
			setTooltip(resetBtn, "Clear blip color", { placement: "bottom", delay: 500 });
			resetBtn.addEventListener("click", () => {
				this.hide();
				action.onPick(undefined);
			});

			this.swatchPanelEl = panel;
		}

		// Width changed: re-center while keeping the buttons where they are
		if (this.anchor) this.position(this.anchor, true);
	}

	/**
	 * Remove the bar if it is shown
	 */
	hide(): void {
		this.barEl?.remove();
		this.barEl = null;
		this.swatchPanelEl = null;
		this.anchor = null;
		this.blipId = null;
	}

	isShownFor(blipId: string): boolean {
		return this.blipId === blipId;
	}

	contains(target: EventTarget | null): boolean {
		return !!this.barEl && target instanceof Node && this.barEl.contains(target);
	}

	/**
	 * Center the bar horizontally over the anchor, flipping below it when
	 * there is not enough room above, and keep it inside the host.
	 * With `keepTop`, only the horizontal position is recomputed.
	 */
	private position(anchor: Element, keepTop = false): void {
		if (!this.barEl) return;

		const hostRect = this.host.getBoundingClientRect();
		const anchorRect = anchor.getBoundingClientRect();
		const barWidth = this.barEl.offsetWidth;
		// Measure the buttons only, so the swatch panel never pushes them around
		const barHeight = (this.barEl.firstElementChild as HTMLElement | null)?.offsetHeight ?? this.barEl.offsetHeight;

		const centerX = anchorRect.left + anchorRect.width / 2 - hostRect.left;
		const left = Math.min(
			Math.max(centerX - barWidth / 2, 0),
			Math.max(hostRect.width - barWidth, 0)
		);

		if (keepTop) {
			this.barEl.setCssStyles({ left: `${left}px` });
			return;
		}

		let top = anchorRect.top - hostRect.top - barHeight - BAR_OFFSET;
		if (top < 0) {
			top = anchorRect.bottom - hostRect.top + BAR_OFFSET;
		}

		this.barEl.setCssStyles({ left: `${left}px`, top: `${top}px` });
	}
}
