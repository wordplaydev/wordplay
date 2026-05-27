/** Position the caret-description floating panel against a block in blocks
 *  mode, clamped to the editor's visible scroll container (e.g. the tile's
 *  .content). Returns coordinates in the editor's local positioning context
 *  (the absolute `top`/`left` to set on the description element), or
 *  undefined when measurements aren't yet available. */

import { placeNearTarget } from '@components/widgets/placeNearTarget';

/** Walk up to the nearest ancestor that scrolls (overflow auto/scroll/hidden),
 *  or null if there isn't one. Used to find the actual visible area for
 *  placing floating UI like the caret-description. */
export function getScrollContainer(el: HTMLElement): HTMLElement | null {
    let parent: HTMLElement | null = el.parentElement;
    while (parent) {
        const style = window.getComputedStyle(parent);
        const overflow = style.overflowY + style.overflowX + style.overflow;
        if (/(auto|scroll|hidden)/.test(overflow)) return parent;
        parent = parent.parentElement;
    }
    return null;
}

export function computeCaretDescriptionPosition(args: {
    editor: HTMLElement;
    descriptionElement: HTMLElement;
    blockElement: HTMLElement;
}): { left: number; top: number } | undefined {
    const { editor, descriptionElement, blockElement } = args;

    const blockRect = blockElement.getBoundingClientRect();
    const editorRect = editor.getBoundingClientRect();
    const descRect = descriptionElement.getBoundingClientRect();
    if (descRect.width === 0 || descRect.height === 0) return undefined;

    // Use the editor's scrolling ancestor (the TileView's .content) as the
    // visible area, falling back to the window. The browser window isn't a
    // good proxy for what's visible because the editor sits inside a tile
    // that scrolls independently.
    const scrollContainer = getScrollContainer(editor);
    const containerRect = scrollContainer
        ? scrollContainer.getBoundingClientRect()
        : ({
              left: 0,
              top: 0,
              width: window.innerWidth,
              height: window.innerHeight,
          } as DOMRect);

    // Run placeNearTarget in container-relative coords, then convert the
    // result back through the container and the editor.
    const targetInContainer = {
        left: blockRect.left - containerRect.left,
        top: blockRect.top - containerRect.top,
        width: blockRect.width,
        height: blockRect.height,
    };
    const containerPos = placeNearTarget(
        targetInContainer,
        { width: descRect.width, height: descRect.height },
        { width: containerRect.width, height: containerRect.height },
    );
    return {
        left: containerRect.left + containerPos.left - editorRect.left,
        top: containerRect.top + containerPos.top - editorRect.top,
    };
}
