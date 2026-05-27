import Token from '@nodes/Token';
import type Source from '@nodes/Source';
import { measureTokenSegment } from './highlights/measureTokenSegment';

/** Editor-relative coordinates for rendering a floating caret line. */
export type RemoteCaretLocation = {
    left: number;
    top: number;
    height: number;
};

/**
 * Compute editor-viewport-relative coordinates for a *remote* user's caret
 * given a character offset into a Source's text. Mirrors the subset of
 * CaretView.computeLocation that handles text-mode integer positions; we
 * deliberately don't reproduce the block-mode Node/Path or selection-range
 * branches here — the chip in the editor footer covers those cases without
 * needing to position floating overlays for them.
 *
 * Returns undefined when the caret can't be anchored to any rendered token
 * (e.g. the remote is editing a different source, the DOM hasn't caught up
 * to a recent edit, or the position falls outside the source).
 */
export function computeRemoteCaretLocation(
    source: Source,
    position: number,
    viewport: HTMLElement,
    blocks: boolean,
): RemoteCaretLocation | undefined {
    const token = source.getTokenAt(position, true);
    if (token === undefined) return undefined;

    const tokenStart = source.tokenPositions.get(token);
    if (tokenStart === undefined) return undefined;

    // `getTokenAt(..., includingWhitespace=true)` may give us a token whose
    // leading-space band the caret falls in. Clamp to a non-negative offset
    // into the token's own text so the substring measurement is valid.
    const tokenOffset = Math.max(0, position - tokenStart);

    const tokenView = viewport.querySelector<HTMLElement>(
        `.token-view[data-id="${(token as Token).id}"]`,
    );
    if (tokenView === null) return undefined;

    const tokenRect = tokenView.getBoundingClientRect();
    const viewportRect = viewport.getBoundingClientRect();

    let dx = 0;
    let height = tokenRect.height;
    if (tokenOffset > 0) {
        const measured = measureTokenSegment(tokenView, tokenOffset, blocks);
        if (measured !== undefined) {
            dx = measured[0];
            if (measured[1] > 0) height = measured[1];
        }
    }

    return {
        left: tokenRect.left - viewportRect.left + dx,
        top: tokenRect.top - viewportRect.top,
        height,
    };
}
