/**
 * Shared color swatch picker used in CustomizeRadarModal and EditBlipColorModal
 */

export const PRESET_COLORS = [
	"#fb464c",
	"#e9973f",
	"#e0ac00",
	"#44cf6e",
	"#53dfdd",
	"#027aff",
	"#a882ff",
];

/**
 * Populate `container` with preset color swatches and a custom color input.
 * @param container  The element to append swatches into
 * @param currentColor  Currently selected color (undefined = none)
 * @param onChange  Called immediately when a color is picked (for live preview)
 * @param onCommit  Called when the selection is finalised (e.g. custom picker closed)
 */
export function fillColorSwatches(
	container: HTMLElement,
	currentColor: string | undefined,
	onChange: (color: string) => void,
	onCommit: () => void
): void {
	const isCustom = currentColor !== undefined && !PRESET_COLORS.includes(currentColor);

	for (const colorVar of PRESET_COLORS) {
		const swatch = container.createEl("div", { cls: "radar-color-swatch" });
		swatch.style.background = colorVar;
		if (currentColor === colorVar) {
			swatch.addClass("radar-color-swatch--selected");
		}
		swatch.addEventListener("click", () => {
			onChange(colorVar);
			onCommit();
		});
	}

	// Custom color swatch — opens native color picker
	const customSwatch = container.createEl("div", { cls: "radar-color-swatch radar-color-swatch--custom" });
	if (isCustom) {
		customSwatch.addClass("radar-color-swatch--selected");
	}

	const colorInput = customSwatch.createEl("input", {
		cls: "radar-color-swatch-input",
		attr: { type: "color" },
	});
	if (isCustom && currentColor) {
		colorInput.value = currentColor;
	}

	colorInput.addEventListener("input", (e) => {
		onChange((e.target as HTMLInputElement).value);
	});
	colorInput.addEventListener("change", () => {
		onCommit();
	});

	customSwatch.addEventListener("click", (e) => {
		if (e.target !== colorInput) colorInput.click();
	});
}
