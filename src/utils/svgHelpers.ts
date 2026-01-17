/**
 * SVG Helper Functions
 * Utilities for creating SVG elements
 */

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Create an SVG element with attributes
 */
export function createSvgElement<K extends keyof SVGElementTagNameMap>(
	tagName: K,
	attributes?: Record<string, string | number>
): SVGElementTagNameMap[K] {
	const element = document.createElementNS(SVG_NS, tagName);
	if (attributes) {
		for (const [key, value] of Object.entries(attributes)) {
			element.setAttribute(key, String(value));
		}
	}
	return element;
}

/**
 * Create the main SVG container
 */
export function createSvgContainer(
	viewBoxSize: number,
	className: string
): SVGSVGElement {
	return createSvgElement("svg", {
		class: className,
		viewBox: `0 0 ${viewBoxSize} ${viewBoxSize}`,
		preserveAspectRatio: "xMidYMid meet",
	});
}

/**
 * Create a circle element
 */
export function createCircle(
	cx: number,
	cy: number,
	r: number,
	className?: string,
	attributes?: Record<string, string | number>
): SVGCircleElement {
	return createSvgElement("circle", {
		cx,
		cy,
		r,
		...(className && { class: className }),
		...attributes,
	});
}

/**
 * Create a line element
 */
export function createLine(
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	className?: string,
	attributes?: Record<string, string | number>
): SVGLineElement {
	return createSvgElement("line", {
		x1,
		y1,
		x2,
		y2,
		...(className && { class: className }),
		...attributes,
	});
}

/**
 * Create a text element
 */
export function createText(
	x: number,
	y: number,
	text: string,
	className?: string,
	attributes?: Record<string, string | number>
): SVGTextElement {
	const element = createSvgElement("text", {
		x,
		y,
		...(className && { class: className }),
		...attributes,
	});
	element.textContent = text;
	return element;
}

/**
 * Create a group element
 */
export function createGroup(
	className?: string,
	attributes?: Record<string, string | number>
): SVGGElement {
	return createSvgElement("g", {
		...(className && { class: className }),
		...attributes,
	});
}

/**
 * Set multiple attributes on an element
 */
export function setAttributes(
	element: SVGElement,
	attributes: Record<string, string | number>
): void {
	for (const [key, value] of Object.entries(attributes)) {
		element.setAttribute(key, String(value));
	}
}
