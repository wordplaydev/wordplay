<svelte:options immutable={true} />

<script context="module" lang="ts">
    export type CaretBounds = {
        top: number;
        left: number;
        height: number;
        bottom: number;
    };
</script>

<script lang="ts">
    import { afterUpdate, tick } from 'svelte';
    import Spaces, { SPACE_HTML, TAB_HTML } from '@parser/Spaces';
    import type Source from '@nodes/Source';
    import Node from '@nodes/Node';
    import { animationDuration, blocks, locales } from '../../db/Database';
    import type Caret from '../../edit/Caret';
    import { getEditor, getEvaluation } from '../project/Contexts';
    import type Token from '@nodes/Token';

    export let caret: Caret;
    export let source: Source;
    export let blink: boolean;
    export let ignored: boolean;

    // The current location of the caret.
    export let location: CaretBounds | undefined = undefined;

    let editorPadding: number | undefined = undefined;

    // The HTMLElement rendering this view.
    let element: HTMLElement;

    // The current token we're on.
    $: token = caret?.getToken();

    $: leftToRight = $locales.getDirection() === 'ltr';

    // The index we should render
    let caretIndex: number | undefined = undefined;

    const evaluation = getEvaluation();
    const editor = getEditor();

    // Whenever blocks, evaluation, or caret changes, compute position after animation delay.
    $: {
        $blocks;
        $evaluation;
        caret;
        $editor;
        tick().then(() =>
            setTimeout(
                () => (location = computeLocation()),
                $animationDuration + 25,
            ),
        );
    }

    // Whenever the caret changes, update the index we should render and scroll to it.
    $: {
        // Position depends on writing direction and layout and blocks mode
        if (
            token !== undefined &&
            caret !== undefined &&
            $locales.getDirection()
        ) {
            // Get some of the token's metadata
            let spaceIndex = caret.source.getTokenSpacePosition(token);
            let lastIndex = caret.source.getTokenLastPosition(token);
            let textIndex = caret.source.getTokenTextPosition(token);

            // Compute where the caret should be placed. Place it if...
            caretIndex =
                // This token has to be in the source
                spaceIndex !== undefined &&
                lastIndex !== undefined &&
                textIndex !== undefined &&
                // Only show the caret if it's pointing to a number
                typeof caret.position === 'number' &&
                // The position can be anywhere after after the first glyph of the token, up to and including after the token's last character,
                // or the end token of the program.
                (caret.isEnd() ||
                    // It must be after the start OR at the start and not whitespace
                    ((caret.position >= spaceIndex ||
                        (caret.position === spaceIndex &&
                            (spaceIndex === 0 ||
                                !caret.isSpace(
                                    caret.source.getCode().at(spaceIndex) ?? '',
                                )))) &&
                        // ... and it must be before the end OR at the end and either the very end or at whitespace.
                        caret.position <= lastIndex))
                    ? // The offset at which to render the token is the caret in it's text.
                      // If the caret position is on a newline or tab, then it will be negative.
                      caret.position - textIndex
                    : undefined;
        }
        // Update the caret's location.
        location = computeLocation();
        // Now that we've rendered the caret, if it's out of the viewport and we're not evaluating, scroll to it.
        scrollToCaret();
    }

    async function scrollToCaret() {
        await tick();
        if (element) element.scrollIntoView({ block: 'nearest' });
    }

    // After we render, update the caret position.
    afterUpdate(() => {
        // Update the caret's location, in case other things changed.
        location = computeLocation();
    });

    function getNodeView(node: Node) {
        const editorView = element?.parentElement;
        if (editorView === null) return null;

        const tokenView =
            editorView.querySelector(`.token-view[data-id="${node.id}"]`) ??
            null;

        // No token view? (This can happen when stepping, since values are rendered instead of nodes.)
        // Try to find the nearest ancestor that is rendered and return that instead.
        if (tokenView !== null) return tokenView;

        const parents = [node, ...source.root.getAncestors(node)];
        do {
            const parent = parents.shift();
            if (parent) {
                const parentView = editorView.querySelector(
                    `.node-view[data-id="${parent.id}"]`,
                );
                if (parentView) return parentView;
            }
        } while (parents.length > 0);

        return null;
    }

    function computeCaretAndLineHeight(
        editor: HTMLElement,
        currentToken: Token,
        currentTokenRect: DOMRect,
        horizontal: boolean,
    ): [number, number] {
        // To compute line height, find two tokens on adjacent lines and difference their tops.
        const tokenViews = editor.querySelectorAll(`.Token`);
        let firstTokenView: Element | undefined = undefined;
        let firstTokenViewAfterLineBreak: Element | undefined = undefined;
        let lineBreakCount: number | undefined = undefined;
        for (const nextView of tokenViews) {
            if (firstTokenView === undefined) firstTokenView = nextView;
            else {
                const lineBreaks = nextView.querySelectorAll('br');
                if (lineBreaks.length > 0) {
                    firstTokenViewAfterLineBreak = nextView;
                    lineBreakCount = lineBreaks.length;
                    break;
                }
            }
        }

        let caretHeight = horizontal
            ? currentTokenRect.height
            : currentTokenRect.width;

        if (caretHeight === 0) {
            const before = source.getTokenBefore(currentToken);
            const beforeView = before ? getNodeView(before) : undefined;
            caretHeight = beforeView?.getBoundingClientRect().height ?? 0;
        }

        let lineHeight;

        if (
            firstTokenView &&
            firstTokenViewAfterLineBreak &&
            lineBreakCount !== undefined
        ) {
            const firstTokenAfterLineBreakBound = (
                firstTokenViewAfterLineBreak.querySelector(
                    '.token-view',
                ) as Element
            ).getBoundingClientRect();
            const firstTokenBound = (
                firstTokenView.querySelector('.token-view') as Element
            ).getBoundingClientRect();

            lineHeight = horizontal
                ? (firstTokenAfterLineBreakBound.top - firstTokenBound.top) /
                  lineBreakCount
                : (firstTokenAfterLineBreakBound.left - firstTokenBound.left) /
                  lineBreakCount;
        } else {
            lineHeight = horizontal
                ? currentTokenRect.height
                : currentTokenRect.width;
        }

        return [caretHeight, lineHeight];
    }

    function computeSpaceDimensions(
        editor: HTMLElement,
        currentToken: Token,
    ): {
        spaceWidth: number;
        spaceHeight: number;
        tabWidth: number;
        tabHeight: number;
    } {
        // Get some measurements on spaces and tab.
        const spaceElement = editor.querySelector(
            `.space[data-id="${currentToken.id}"]`,
        );
        if (spaceElement === null)
            return { spaceWidth: 0, spaceHeight: 0, tabWidth: 0, tabHeight: 0 };
        const spaceText = spaceElement.innerHTML;
        spaceElement.innerHTML = SPACE_HTML;
        const spaceBounds = spaceElement.getBoundingClientRect();
        const spaceWidth = spaceBounds.width;
        const spaceHeight = spaceBounds.height;
        spaceElement.innerHTML = TAB_HTML;
        const tabBounds = spaceElement.getBoundingClientRect();
        const tabWidth = tabBounds.width;
        const tabHeight = tabBounds.height;
        spaceElement.innerHTML = spaceText;

        return { spaceWidth, spaceHeight, tabWidth, tabHeight };
    }

    function computeLocation(): CaretBounds | undefined {
        if (caret === undefined) return;

        // The editor is always horizontal-tb
        const horizontal = true;

        // Start assuming no position.
        location = undefined;

        // No caret view? No caret.
        if (element === null || element === undefined) return;

        // Find views, and if any are missing, bail.
        const editorView = element.parentElement;
        if (editorView === null) return;

        const viewport = editorView;
        if (viewport === null) return;

        // Get the padding
        if (editorPadding === undefined) {
            const editorStyle = window.getComputedStyle(editorView);
            editorPadding = parseInt(
                editorStyle.getPropertyValue('padding-left').replace('px', ''),
            );
        }

        const viewportRect = viewport.getBoundingClientRect();
        const viewportWidth = viewportRect.width;

        // Compute the top left of the editor's viewport.
        const viewportXOffset = -viewportRect.left + viewport.scrollLeft;
        const viewportYOffset = -viewportRect.top + viewport.scrollTop;

        // If the caret is a node, find the bottom left token view.
        if (caret.position instanceof Node) {
            const nodeView = getNodeView(caret.position);
            if (nodeView === null) return;

            // ... and it's a placeholder, then position a caret in it's center
            if (caret.isPlaceholderNode()) {
                const placeholderView = nodeView.querySelector(
                    '.token-view > .placeholder',
                );
                const placeholderViewRect =
                    placeholderView?.getBoundingClientRect();
                if (placeholderViewRect) {
                    return {
                        left:
                            placeholderViewRect.left +
                            viewportXOffset +
                            placeholderViewRect.width / 2,
                        top: placeholderViewRect.top + viewportYOffset,
                        height: placeholderViewRect.height,
                        bottom: placeholderViewRect.bottom + viewportYOffset,
                    };
                }
            }
            // ... and it's not a placeholder, position (invisible) caret at it's top left
            // This is for scrolling purposes.
            else {
                // Find the bottom left token or value view.
                const tokenAndValueViews = nodeView.classList.contains(
                    'token-view',
                )
                    ? [nodeView]
                    : Array.from(
                          nodeView.querySelectorAll(':is(.token-view, .value)'),
                      );
                if (tokenAndValueViews.length === 0) return;
                // Get the bounding rect of the last token or value in the layout
                // and place the caret there for scrolling purposes.
                const nodeViewRect =
                    tokenAndValueViews[
                        tokenAndValueViews.length - 1
                    ].getBoundingClientRect();

                return {
                    left: nodeViewRect.left + viewportXOffset,
                    top: nodeViewRect.top + viewportYOffset,
                    height: nodeViewRect.height,
                    bottom: nodeViewRect.bottom + viewportYOffset,
                };
            }
        }

        // No token? No caret.
        if (token === undefined) return;

        // No index to render? No caret.
        if (caretIndex === undefined) return;

        const tokenView = getNodeView(token);
        if (tokenView === null) return;

        // Figure out where the token view is, so we can properly offset the caret position in the editor.
        const tokenViewRect = tokenView.getBoundingClientRect();

        // Find the token start position, depending on whether we're rendering left to right or right to left.
        let tokenStart =
            (leftToRight ? tokenViewRect.left : tokenViewRect.right) +
            viewportXOffset;
        let tokenTop = tokenViewRect.top + viewportYOffset;

        const [caretHeight, lineHeight] = computeCaretAndLineHeight(
            editorView,
            token,
            tokenViewRect,
            horizontal,
        );

        // Is the caret in the text, and not the space?
        if (caretIndex > 0) {
            // Trim the text to the position
            const trimmedText = token.text.substring(0, caretIndex).toString();
            // Get the text node of the token view
            const textNode = tokenView.childNodes[0];
            // Create a trimmed node, but replace spaces in the trimmed text with visible characters so that they are included in measurement.
            const tempNode = document.createTextNode(
                trimmedText.replaceAll(' ', '·'),
            );
            // Temporarily replace the node
            textNode.replaceWith(tempNode);
            // Get the trimmed text element's dimensions
            const trimmedBounds = tokenView.getBoundingClientRect();
            const widthAtCaret = trimmedBounds.width;
            const heightAtCaret = trimmedBounds.height;

            // Restore the text node
            tempNode.replaceWith(textNode);

            return {
                // If horizontal, set the left of the caret offset at the measured width in the direction of the writing.
                left:
                    tokenStart +
                    (horizontal ? (leftToRight ? 1 : -1) * widthAtCaret : 0),
                // If vertical, set the top of the caret offset at the measured height in the direction of the writing.
                top: tokenTop + (horizontal ? 0 : heightAtCaret),
                height: caretHeight,
                bottom: tokenTop + tokenViewRect.height,
            };
        }
        // If the caret is in the preceding space, compute the top/left of the space position.
        else {
            // Three cases to handle...
            //   1) The caret is in space trailing a line (including just at the end of the line, just before a newline).
            //   2) The caret is somewhere on an empty line.
            //   3) The caret is in the space preceding a token.
            // Figure out which three of this is the case, then position accordingly.

            const explicitSpace = source.spaces.getSpace(token);

            const spaceIndex = explicitSpace.length + caretIndex;
            const spaceBefore = explicitSpace.substring(0, spaceIndex);
            const spaceAfter = explicitSpace.substring(spaceIndex);

            // Find the start position of the editor, based on language direction.
            const editorHorizontalStart =
                leftToRight && horizontal
                    ? editorPadding
                    : viewportWidth - editorPadding;
            const editorVerticalStart = editorPadding + 4;

            const { spaceWidth, spaceHeight, tabWidth, tabHeight } =
                computeSpaceDimensions(editorView, token);

            // Find the right side of token just prior to the current one that has this space.
            const priorToken = caret.source.getNextToken(token, -1);
            const priorTokenView = priorToken
                ? getNodeView(priorToken)
                : undefined;
            const priorTokenViewRect = priorTokenView?.getBoundingClientRect();
            let priorTokenHorizontalEnd =
                priorTokenViewRect === undefined
                    ? editorHorizontalStart
                    : (leftToRight
                          ? priorTokenViewRect.right
                          : priorTokenViewRect.left) + viewportXOffset;

            let priorTokenVerticalEnd =
                priorTokenViewRect === undefined
                    ? editorVerticalStart
                    : (leftToRight
                          ? priorTokenViewRect.bottom
                          : priorTokenViewRect.top) + viewportYOffset;

            let priorTokenLeft =
                priorTokenViewRect === undefined
                    ? editorHorizontalStart - (!horizontal ? lineHeight : 0)
                    : priorTokenViewRect.left + viewportXOffset;

            let priorTokenTop =
                priorTokenViewRect === undefined
                    ? editorVerticalStart
                    : priorTokenViewRect.top + viewportYOffset;

            // 1) Trailing space (the caret is before the first newline)
            if (spaceBefore.indexOf('\n') < 0) {
                // Count the number of spaces prior to the next newline.
                const spaces = spaceBefore.split(' ').length - 1;
                const tabs = spaceBefore.split('\t').length - 1;

                if (horizontal) {
                    // For horizontal layout, place the caret to the right of the prior token, {spaces} after.
                    return {
                        left:
                            priorTokenHorizontalEnd +
                            (leftToRight ? 1 : -1) *
                                (spaces * spaceWidth + tabs * tabWidth),
                        top: priorTokenTop,
                        height: caretHeight,
                        bottom: priorTokenTop + caretHeight,
                    };
                } else {
                    // For vertical layouts, place the caret to below the prior token, {spaces} after.
                    return {
                        left: priorTokenLeft,
                        top:
                            priorTokenVerticalEnd +
                            (leftToRight ? 1 : -1) *
                                (spaces * spaceHeight + tabs * tabHeight),
                        height: caretHeight,
                        bottom: priorTokenLeft + caretHeight,
                    };
                }
            }
            // 2) Empty line (there is a newline before and after the current position)
            else if (
                spaceBefore.indexOf('\n') >= 0 &&
                spaceAfter.indexOf('\n') >= 0
            ) {
                // Place the caret's left the number of spaces on this line
                const beforeLines = spaceBefore.split('\n');
                const spaceOnLine = beforeLines[beforeLines.length - 1];

                const spaces = spaceOnLine.split(' ').length - 1;
                const tabs = spaceOnLine.split('\t').length - 1;

                const offset =
                    (spaceBefore.split('\n').length - 1) * lineHeight;

                if (horizontal) {
                    // Place the caret's top at {tokenHeight} * {number of new lines prior}
                    const spaceTop = priorTokenTop + offset;
                    return {
                        left:
                            editorHorizontalStart +
                            (leftToRight ? 1 : -1) *
                                (spaces * spaceWidth + tabs * tabWidth),
                        top: spaceTop,
                        height: caretHeight,
                        bottom: spaceTop + caretHeight,
                    };
                } else {
                    const spaceLeft = priorTokenLeft - offset;
                    return {
                        left: spaceLeft,
                        top:
                            editorVerticalStart +
                            (leftToRight ? 1 : -1) *
                                (spaces * spaceHeight + tabs * tabHeight),
                        height: caretHeight,
                        bottom: spaceLeft + caretHeight,
                    };
                }
            }
            // 3) Preceding space (the caret is after the last newline)
            else {
                // Get the last line of spaces.
                const spaceLines = explicitSpace.split('\n');
                let spaceOnLastLine = spaceLines[spaceLines.length - 1];
                // Truncate everything on the last line of spaces after the current position of the caret.
                spaceOnLastLine = spaceOnLastLine.substring(
                    0,
                    spaceOnLastLine.length -
                        (explicitSpace.length - spaceIndex),
                );

                // If there's preferred space after the explicit space, and we're on the last line of explicit space, include it.
                if (explicitSpace.length - spaceIndex === 0) {
                    spaceOnLastLine += caret.source.spaces.getAdditionalSpace(
                        token,
                        Spaces.getPreferredPrecedingSpace(
                            caret.source.root,
                            caret.source.spaces.getSpace(token),
                            token,
                        ) ?? '',
                    );
                }

                // Compute the spaces prior to the caret on this line.
                const spaces = spaceOnLastLine.split(' ').length - 1;
                const tabs = spaceOnLastLine.split('\t').length - 1;

                let spaceTop = tokenTop;

                // Figure out where to start. In text mode, it's the editor left.
                // In blocks mode, it's the left of the closest parent that is in block layout.
                let horizontalStart: number;
                if ($blocks) {
                    // We have to be careful about what "in" means in blocks mode.
                    // If the token whose space we're in is a first leaf, we want to find the
                    // highest block for which it is, and find the horizontal start of it's view.
                    // Otherwise, we just want to find the containing block and find it's horizontal start.
                    // If there isn't one, then we use the editor horizontal start.
                    // For the token that is the first token of a block, we want the horizontal start
                    // of the block that contains that first leaf, since it's space is outside the block.

                    // Find the highest block layout node for which this is first leaf.
                    let blockParents = [];
                    let parent = tokenView.parentElement;
                    while (parent !== null) {
                        if (parent.classList.contains('block'))
                            blockParents.push(parent);
                        parent = parent.parentElement;
                    }
                    while (
                        blockParents.length > 0 &&
                        blockParents[0].querySelectorAll('.token-view')[0] ===
                            tokenView
                    )
                        blockParents.shift();
                    const containingBlockView =
                        blockParents[0] ?? tokenView.closest('.block');

                    const rect = containingBlockView?.getBoundingClientRect();
                    horizontalStart =
                        rect === undefined
                            ? editorHorizontalStart
                            : (leftToRight ? rect.left : rect.right) +
                              viewportXOffset;

                    // if (rect)
                    //     spaceTop = rect.bottom + viewportYOffset - caretHeight;
                } else horizontalStart = editorHorizontalStart;

                if (horizontal) {
                    return {
                        left:
                            horizontalStart +
                            (leftToRight ? 1 : -1) *
                                (spaces * spaceWidth + tabs * tabWidth),
                        top: spaceTop,
                        height: caretHeight,
                        bottom: spaceTop + caretHeight,
                    };
                } else {
                    return {
                        left: tokenStart,
                        top:
                            editorVerticalStart +
                            (leftToRight ? 1 : -1) *
                                (spaces * spaceWidth + tabs * tabWidth),
                        height: caretHeight,
                        bottom: spaceTop + caretHeight,
                    };
                }
            }
        }
    }
</script>

<span
    class="caret {blink ? 'blink' : ''} {ignored ? 'ignored' : ''}"
    class:focused={$editor?.focused}
    class:node={caret && caret.isNode() && !caret.isPlaceholderNode()}
    style:display={location === undefined ? 'none' : null}
    style:left={location ? `${location.left}px` : null}
    style:top={location ? `${location.top}px` : null}
    style:width={location ? `2px` : null}
    style:height={location ? `${location.height}px` : null}
    bind:this={element}
/>

<style>
    .caret {
        position: absolute;
        background-color: var(--wordplay-foreground);
        opacity: 0.25;
    }

    .focused {
        opacity: 1;
    }

    .node {
        visibility: hidden;
    }

    .caret.blink {
        animation: blink-animation 0.5s steps(2, start) infinite;
    }

    .caret.ignored {
        animation: shake 1;
        animation-duration: calc(var(--animation-factor) * 200ms);
    }

    @keyframes blink-animation {
        to {
            visibility: hidden;
        }
    }
</style>
