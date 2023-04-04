export function DOMRectCenter(rect: DOMRect): [number, number] {
    return [rect.left + rect.width / 2, rect.top + rect.height];
}

export function DOMRectDistance(
    center: [number, number],
    rect: DOMRect
): number {
    const rectCenter = DOMRectCenter(rect);
    return Math.sqrt(
        Math.pow(center[0] - rectCenter[0], 2) +
            Math.pow(center[1] - rectCenter[1], 2)
    );
}
