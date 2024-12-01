<script module lang="ts">
    export type CaretBounds = {
        top: number;
        left: number;
        height: number;
        bottom: number;
    };

    export function getVerticalCenterOfBounds(rect: DOMRect) {
        return rect.top + rect.height / 2;
    }

    export function getHorizontalCenterOfBounds(rect: DOMRect) {
        return rect.left + rect.width / 2;
    }

    /** Move the caret to the nearest vertical token in the given direction and editor. */
    export function moveVisualVertical(
        direction: -1 | 1,
        editor: HTMLElement,
        caret: Caret,
    ): Caret | undefined {
        // Find the token view that the caret is in.
        const currentToken =
            caret.position instanceof Node ? caret.position : caret.getToken();
        if (currentToken === undefined) return undefined;
        const currentTokenView = getNodeView(editor, currentToken);
        if (currentTokenView === null) return undefined;
        const bounds = currentTokenView.getBoundingClientRect();
        const vertical = getVerticalCenterOfBounds(bounds);
        const horizontal = getHorizontalCenterOfBounds(bounds);
        const verticalThreshold = bounds.height;

        // Find all the token views
        const nearest = Array.from(editor.querySelectorAll('.token-view'))
            .map((el) => {
                const elBounds = el.getBoundingClientRect();
                return {
                    node:
                        el instanceof HTMLElement && el.dataset.id
                            ? (caret.source.getNodeByID(
                                  parseInt(el.dataset.id),
                              ) ?? null)
                            : null,
                    horizontal:
                        getHorizontalCenterOfBounds(elBounds) - horizontal,
                    vertical: getVerticalCenterOfBounds(elBounds) - vertical,
                };
            })
            .filter(
                (node) =>
                    node.node instanceof Token &&
                    Caret.isBlockEditable(node.node) &&
                    // Filter out nodes in the wrong direction
                    (direction < 0 ? node.vertical < 0 : node.vertical > 0) &&
                    // Filter out nodes that are too close vertically
                    Math.abs(node.vertical) > verticalThreshold,
            )
            // Sort by closest distance of remaining
            .sort(
                (a, b) =>
                    Math.pow(a.horizontal, 2) +
                    Math.pow(a.vertical, 2) -
                    (Math.pow(b.horizontal, 2) + Math.pow(b.vertical, 2)),
            );

        const closest = nearest[0];

        if (closest && closest.node) return caret.withPosition(closest.node);
        else return undefined;
    }

    export function getTokenView(
        editor: HTMLElement,
        token: Token,
    ): HTMLElement | null {
        return editor.querySelector(`.token-view[data-id="${token.id}"]`);
    }

    export function getNodeView(
        editor: HTMLElement,
        token: Node,
    ): HTMLElement | null {
        return editor.querySelector(`.node-view[data-id="${token.id}"]`);
    }
</script>

<script lang="ts">
    import { tick, untrack } from 'svelte';
    import Node from '@nodes/Node';
    import {
        animationDuration,
        locales,
        spaceIndicator,
    } from '../../db/Database';
    import Caret from '../../edit/Caret';
    import { getEditor, getEvaluation } from '../project/Contexts';
    import Token from '@nodes/Token';
    import UnicodeString from '@models/UnicodeString';
    import { EXPLICIT_TAB_TEXT, TAB_TEXT } from '@parser/Spaces';
    import MenuTrigger from './MenuTrigger.svelte';

    interface Props {
        /** The current caret state to render */
        caret: Caret;
        /** Whether to blink the caret*/
        blink: boolean;
        /** Whether the last event was ignored and so the caret should wiggle */
        ignored: boolean;
        /** Whether the caret is in blocks mode */
        blocks: boolean;
        /** The current location of the caret */
        location: CaretBounds | undefined;
    }

    let {
        caret,
        blink,
        ignored,
        blocks,
        location = $bindable(undefined),
    }: Props = $props();

    /** The calculated padding of the editor. Determined from the DOM. */
    let editorPadding = $state<number | undefined>(undefined);

    /** The HTMLElement rendering this view. */
    let element = $state<HTMLElement | null>(null);

    /** Derive the current token we're on. */
    let token = $derived(caret?.getToken());

    /** Derive the direction of text for the current locale */
    let leftToRight = $derived($locales.getDirection() === 'ltr');

    // The index we should render is derived from the caret and locales.
    let caretIndex: number | undefined = $derived.by(() => {
        {
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
                return (
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
                                            caret.source
                                                .getCode()
                                                .at(spaceIndex) ?? '',
                                        )))) &&
                                // ... and it must be before the end OR at the end and either the very end or at whitespace.
                                caret.position <= lastIndex))
                        ? // The offset at which to render the token is the caret in it's text.
                          // If the caret position is on a newline or tab, then it will be negative.
                          caret.position - textIndex
                        : undefined
                );
            } else return undefined;
        }
    });

    // Get evaluation context from parent
    const evaluation = getEvaluation();

    // Get the editor context from the parent
    const editor = getEditor();

    let timeout = $state<NodeJS.Timeout | undefined>(undefined);
    // Whenever the caret changes, wait for rendering, then compute it's location.
    $effect(() => {
        caret;
        // Not playing? Depend on evaluation $evaluation. Otherwise, only update when caret changes.
        // We do this because when stepping, things hide and show and we need to update the caret
        // position when they do. But we don't want to do it when playing, otherwise the editor
        // scrolls to the caret whenever the evaluation steps, which can be a lot when playing!
        if (untrack(() => !$evaluation.evaluator.isPlaying())) $evaluation;
        tick().then(() => {
            location = computeLocation();
            // Because some elements fade out when caret changes, affecting layout, we also need to recompute
            // the caret position after the default animation duration.
            untrack(() => {
                if (timeout) clearTimeout(timeout);
                timeout = setTimeout(() => {
                    location = computeLocation();
                }, $animationDuration + 25);
            });
        });
    });

    // When caret location or view changes and not playing, tick, then scroll to it.
    $effect(() => {
        if (location && element && $evaluation.playing)
            tick().then(() => {
                if (element) element.scrollIntoView({ block: 'nearest' });
            });
    });

    function getNodeView(node: Node) {
        const editorView = element?.parentElement;
        if (!editorView) return null;

        const tokenView =
            node instanceof Token
                ? (getTokenView(editorView, node) ?? null)
                : null;

        // No token view? (This can happen when stepping, since values are rendered instead of nodes.)
        // Try to find the nearest ancestor that is rendered and return that instead.
        if (tokenView !== null) return tokenView;

        const parents = [node, ...caret.source.root.getAncestors(node)];
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

        // If the caret height is invisible, try to find a token before and get its height.
        // And if that's not visible, then set a minimum.
        if (caretHeight === 0) {
            const before = caret.source.getTokenBefore(currentToken);
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
        /** The index into the space where the caret is. */
        caretIndex: number,
    ): {
        beforeSpaceWidth: number;
        beforeSpaceHeight: number;
    } {
        // Get some measurements on spaces and tab.
        const spaceElement = editor.querySelector(
            `.space[data-id="${currentToken.id}"]`,
        );
        // Couldn't find the space for some reason? Return zero dimensions.
        if (!(spaceElement instanceof HTMLElement))
            return {
                beforeSpaceWidth: 0,
                beforeSpaceHeight: 0,
            };

        // Remember the original HTML
        const originalHTML = spaceElement.innerHTML;

        // Get the lines in the HTML (which are separated by line breaks). This depends closely on the structure created in Space.svelte.
        const lines = Array.from(spaceElement.querySelectorAll('.space-text'));

        // The line that contains the caret index
        let containingLine: UnicodeString | undefined = undefined;
        let currentIndex = 0;
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const nextLine = lines[lineIndex];
            if (nextLine instanceof HTMLElement) {
                // Replace tab text with actual tabs for an accurate count.
                const lineText = new UnicodeString(
                    nextLine.innerText.replaceAll(
                        $spaceIndicator ? EXPLICIT_TAB_TEXT : TAB_TEXT,
                        '\t',
                    ),
                );
                // If the caret index is between and the end of this line (inclusive), then we found our line.
                if (currentIndex + lineText.getLength() >= caretIndex) {
                    containingLine = lineText;
                    // Adjust the caret index to be relative to this line's text so we can compute the dimensions of the text on this line.
                    caretIndex -= currentIndex;
                    // Found it, so we stop looping through lines.
                    break;
                } else {
                    // Increment the glyph count by the number of glyphs in this line, plus one for the newline.
                    currentIndex += lineText.getLength() + 1;
                }
            }
        }

        // If we didn't find a line, return zero dimensions.
        if (containingLine === undefined)
            return {
                beforeSpaceWidth: 0,
                beforeSpaceHeight: 0,
            };

        // If we found the line, find the glyphs before the caret index.
        const beforeSpace = containingLine.substring(0, caretIndex);

        // Temporarily assign the inner HTML of the space component to the text before the caret on the line.
        spaceElement.innerHTML = beforeSpace
            .toString()
            .replaceAll('\t', $spaceIndicator ? EXPLICIT_TAB_TEXT : TAB_TEXT);
        const beforeSpaceBounds = spaceElement.getBoundingClientRect();
        const beforeSpaceWidth = beforeSpaceBounds.width;
        const beforeSpaceHeight = beforeSpaceBounds.height;

        // Restore the original HTML
        spaceElement.innerHTML = originalHTML;

        // Return the computed space.
        return {
            beforeSpaceWidth,
            beforeSpaceHeight,
        };
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
                    '.placeholder .token-category-placeholder',
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
            const textNode = Array.from(tokenView.childNodes).find(
                (node) => node.nodeType === node.TEXT_NODE,
            );
            let widthAtCaret = 0;
            let heightAtCaret = 0;
            if (textNode) {
                // Create a trimmed node, but replace spaces in the trimmed text with visible characters so that they are included in measurement.
                const tempNode = document.createTextNode(
                    trimmedText.replaceAll(' ', '·'),
                );
                // Temporarily replace the node
                textNode.replaceWith(tempNode);
                // Get the trimmed text element's dimensions
                const trimmedBounds = tokenView.getBoundingClientRect();
                widthAtCaret = trimmedBounds.width;
                heightAtCaret = trimmedBounds.height;

                // Restore the text node
                tempNode.replaceWith(textNode);
            }

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

            const explicitSpace = new UnicodeString(
                caret.source.spaces.getSpace(token),
            );

            const spaceIndex = explicitSpace.getLength() + caretIndex;
            const spaceBefore = explicitSpace.substring(0, spaceIndex);
            const spaceAfter = explicitSpace.substring(spaceIndex);

            const { beforeSpaceWidth, beforeSpaceHeight } =
                computeSpaceDimensions(editorView, token, spaceIndex);

            // Find the line number inline end.
            const lineWidth =
                element?.parentElement
                    ?.querySelector('.line-number')
                    ?.getBoundingClientRect().width ?? 0;

            // Find the start position of the editor, based on language direction.
            const editorHorizontalStart =
                leftToRight && horizontal
                    ? editorPadding + lineWidth
                    : viewportWidth - editorPadding;
            const editorVerticalStart = editorPadding + 4;

            // Find the right side of token just prior to the current one that has this space.
            let priorToken: Token | undefined = token;
            let priorTokenView: Element | null = null;
            do {
                priorToken = caret.source.getNextToken(priorToken, -1);
                priorTokenView = priorToken ? getNodeView(priorToken) : null;
                // We need to make sure the prior token is visible. If we found a visible one,
                // then stop and compute based on that position.
                if (
                    priorToken === undefined ||
                    (priorTokenView !== null &&
                        priorTokenView.closest('.hide') === null)
                )
                    break;
            } while (true);

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
            if (spaceBefore.indexOfCharacter('\n') < 0) {
                if (horizontal) {
                    // For horizontal layout, place the caret to the right of the prior token, {spaces} after.
                    return {
                        left:
                            priorTokenHorizontalEnd +
                            (leftToRight ? 1 : -1) * beforeSpaceWidth,
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
                            (leftToRight ? 1 : -1) * beforeSpaceHeight,
                        height: caretHeight,
                        bottom: priorTokenLeft + caretHeight,
                    };
                }
            }
            // 2) Empty line (there is a newline before and after the current position)
            else if (
                spaceBefore.indexOfCharacter('\n') >= 0 &&
                spaceAfter.indexOfCharacter('\n') >= 0
            ) {
                // Find the space container for the token.
                const spaceView = viewport.querySelector(
                    `.space[data-id='${token.id}']`,
                );
                const spaceViewTop =
                    (spaceView?.getBoundingClientRect().top ?? 0) -
                    viewportRect.top;

                // Figure out the height of a line break.
                const breakHeight =
                    viewport.querySelector('.break')?.getBoundingClientRect()
                        .height ?? lineHeight;

                // Place the caret's left the number of spaces on this line.
                // If in blocks mode, account for the fact that we render one fewer spaces due to block layout.
                const offset =
                    (spaceBefore.split('\n').length - 1 - (blocks ? 1 : 0)) *
                    (blocks ? breakHeight : lineHeight);

                if (horizontal) {
                    // Place the caret's top at {tokenHeight} * {number of new lines prior}
                    const spaceTop =
                        (blocks ? spaceViewTop : priorTokenTop) + offset;
                    return {
                        left:
                            editorHorizontalStart +
                            (leftToRight ? 1 : -1) * beforeSpaceWidth,
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
                            (leftToRight ? 1 : -1) * beforeSpaceHeight,
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
                        (explicitSpace.getLength() - spaceIndex),
                );

                let spaceTop = tokenTop;

                // Figure out where to start. In text mode, it's the editor left.
                // In blocks mode, it's the left of the closest parent that is in block layout.
                let horizontalStart: number;
                if (blocks) {
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
                        left: blocks
                            ? tokenStart
                            : horizontalStart +
                              (leftToRight ? 1 : -1) * beforeSpaceWidth,
                        top: spaceTop,
                        height: caretHeight,
                        bottom: spaceTop + caretHeight,
                    };
                } else {
                    return {
                        left: tokenStart,
                        top:
                            editorVerticalStart +
                            (leftToRight ? 1 : -1) * beforeSpaceHeight,
                        height: caretHeight,
                        bottom: spaceTop + caretHeight,
                    };
                }
            }
        }
    }
</script>

<span
    class="caret {blink ? 'blink' : ''} {ignored ? 'ignored' : ''} {blocks
        ? 'blocks'
        : ''}"
    class:focused={$editor?.focused}
    class:node={caret && caret.isNode() && !caret.isPlaceholderNode()}
    style:display={location === undefined ? 'none' : null}
    style:left={location ? `${location.left}px` : null}
    style:top={location ? `${location.top}px` : null}
    bind:this={element}
    ><span
        class="bar"
        style:width={location
            ? blocks
                ? 'var(--wordplay-focus-width)'
                : `2px`
            : null}
        style:height={location ? `${location.height}px` : null}
    ></span>{#if blocks}<div class="trigger"
            ><MenuTrigger position={caret.position} /></div
        >{/if}</span
>

<style>
    .caret {
        position: absolute;
        opacity: 0.25;
    }

    .focused {
        opacity: 1;
    }

    .node {
        visibility: hidden;
    }

    .bar {
        display: inline-block;
        min-height: var(--wordplay-min-line-height);
        background-color: var(--wordplay-foreground);
    }

    .caret.blink .bar {
        animation: blink-animation 1s steps(2, start) infinite;
    }

    .caret.ignored {
        animation: shake 1;
        animation-duration: calc(var(--animation-factor) * 200ms);
    }

    .blocks.focused .bar {
        background-color: var(--wordplay-highlight-color);
    }

    .trigger {
        position: absolute;
        top: 50%;
        margin-left: -0.25em;
    }

    @keyframes blink-animation {
        to {
            visibility: hidden;
        }
    }
</style>
