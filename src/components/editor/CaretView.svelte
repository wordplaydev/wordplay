<svelte:options immutable={true} />

<script context="module" lang="ts">
    let spaceWidth: number | null = null;
    let tabWidth: number | null = null;
</script>

<script lang="ts">
    import { afterUpdate, tick } from 'svelte';
    import { getCaret } from '../project/Contexts';
    import Spaces, { SPACE_HTML, TAB_HTML } from '@parser/Spaces';
    import type Source from '@nodes/Source';
    import Node from '@nodes/Node';

    type CaretPosition = {
        top: string;
        left: string;
        height: string;
        bottom: number;
    };

    export let source: Source;
    export let blink: boolean;
    export let ignored: boolean;

    // The current location of the caret.
    export let location: CaretPosition | undefined = undefined;

    // The caret of the editor that contains this view.
    let caret = getCaret();

    // The HTMLElement rendering this view.
    let element: HTMLElement;

    // The current token we're on.
    $: token = $caret?.getToken();

    // The index we should render
    let caretIndex: number | undefined = undefined;

    // Whenever the caret changes, update the index we should render and scroll to it.
    $: {
        if (token !== undefined && $caret !== undefined) {
            // Get some of the token's metadata
            let spaceIndex = $caret.source.getTokenSpacePosition(token);
            let lastIndex = $caret.source.getTokenLastPosition(token);
            let textIndex = $caret.source.getTokenTextPosition(token);

            // Compute where the caret should be placed. Place it if...
            caretIndex =
                // This token has to be in the source
                spaceIndex !== undefined &&
                lastIndex !== undefined &&
                textIndex !== undefined &&
                // Only show the caret if it's pointing to a number
                typeof $caret.position === 'number' &&
                // The position can be anywhere after after the first glyph of the token, up to and including after the token's last character,
                // or the end token of the program.
                ($caret.isEnd() ||
                    // It must be after the start OR at the start and not whitespace
                    (($caret.position >= spaceIndex ||
                        ($caret.position === spaceIndex &&
                            (spaceIndex === 0 ||
                                !$caret.isSpace(
                                    $caret.source.getCode().at(spaceIndex) ?? ''
                                )))) &&
                        // ... and it must be before the end OR at the end and either the very end or at whitespace.
                        $caret.position <= lastIndex))
                    ? // The offset at which to render the token is the caret in it's text.
                      // If the caret position is on a newline or tab, then it will be negative.
                      $caret.position - textIndex
                    : undefined;
        }
        // Update the caret's location.
        location = computeLocation();
        // Now that we've rendered the caret, if it's out of the viewport and we're not evaluating, scroll to it.
        if (element) scrollToCaret();
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

    function computeLocation() {
        if ($caret === undefined) return;

        // Start assuming no position.
        location = undefined;

        // No caret view? No caret.
        if (element === null || element === undefined) return;

        // Find views, and if any are missing, bail.
        const editorView = element.parentElement;
        if (editorView === null) return;

        const viewport = editorView;
        if (viewport === null) return;
        const viewportRect = viewport.getBoundingClientRect();

        const viewportXOffset = -viewportRect.left + viewport.scrollLeft;
        const viewportYOffset = -viewportRect.top + viewport.scrollTop;

        // If the caret is a node...
        if ($caret.position instanceof Node) {
            const tokenView = editorView.querySelector(
                `.node-view[data-id="${$caret.position.id}"]`
            );
            if (tokenView === null) return;
            const tokenViewRect = tokenView.getBoundingClientRect();

            // ... and it's a placeholder, then position a caret in it's center
            if ($caret.isPlaceholder()) {
                return {
                    left: `${
                        tokenViewRect.left +
                        viewportXOffset +
                        tokenViewRect.width / 2
                    }px`,
                    top: `${tokenViewRect.top + viewportYOffset}px`,
                    height: `${tokenViewRect.height}px`,
                    bottom: tokenViewRect.bottom + viewportYOffset,
                };
            }
            // ... and it's not a placeholder, position (invisible) caret at it's top left
            // This is for scrolling purposes.
            else
                return {
                    left: `${tokenViewRect.left + viewportXOffset}px`,
                    top: `${tokenViewRect.top + viewportYOffset}px`,
                    height: `${tokenViewRect.height}px`,
                    bottom: tokenViewRect.bottom + viewportYOffset,
                };
        }

        // No token? No caret.
        if (token === undefined) return;

        // No index to render? No caret.
        if (caretIndex === undefined) return;

        const tokenView = editorView.querySelector(
            `.token-view[data-id="${token.id}"]`
        );
        if (tokenView === null) return;

        // Figure out where the token view is, so we can properly offset the caret position in the editor.
        const tokenViewRect = tokenView.getBoundingClientRect();

        let tokenLeft = tokenViewRect.left + viewportXOffset;
        let tokenTop = tokenViewRect.top + viewportYOffset;

        // To compute line height, find two tokens on adjacent lines and difference their tops.
        const tokenViews = editorView.querySelectorAll('.Token');
        let firstTokenView: Element | undefined = undefined;
        let firstTokenViewAfterLineBreak: Element | undefined = undefined;
        let lineBreakCount: number | undefined = undefined;
        for (const tokenView of tokenViews) {
            if (firstTokenView === undefined) firstTokenView = tokenView;
            else {
                const lineBreaks = tokenView.querySelectorAll('br');
                if (lineBreaks.length > 0) {
                    firstTokenViewAfterLineBreak = tokenView;
                    lineBreakCount = lineBreaks.length;
                    break;
                }
            }
        }

        let tokenHeight = tokenViewRect.height;
        let lineHeight;

        if (firstTokenView && firstTokenViewAfterLineBreak && lineBreakCount) {
            lineHeight =
                ((
                    firstTokenViewAfterLineBreak.querySelector(
                        '.token-view'
                    ) as Element
                ).getBoundingClientRect().top -
                    (
                        firstTokenView.querySelector('.token-view') as Element
                    ).getBoundingClientRect().top) /
                lineBreakCount;
        } else {
            lineHeight = tokenViewRect.height;
        }

        // Is the caret in the text, and not the space?
        if (caretIndex > 0) {
            // Measure the width of the text at this index, if we haven't already.
            let widthAtCaret = undefined;
            // Trim the text to the position
            const trimmedText = token.text.substring(0, caretIndex).toString();
            // Get the text node of the token view
            const textNode = tokenView.childNodes[0];
            // Create a trimmed node, but replace spaces in the trimmed text with visible characters so that they are included in measurement.
            const tempNode = document.createTextNode(
                trimmedText.replaceAll(' ', '·')
            );
            // Temporarily replace the node
            textNode.replaceWith(tempNode);
            // Get the text element's new width
            widthAtCaret = tokenView.getBoundingClientRect().width;
            // Restore the text node
            tempNode.replaceWith(textNode);

            // Set the left of the caret at the measured width.
            return {
                left: `${tokenLeft + widthAtCaret}px`,
                top: `${tokenTop}px`,
                height: `${tokenHeight}px`,
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

            let spaceTop: number;

            // Get some measurements about the viewport.
            const editorStyle = window.getComputedStyle(editorView);
            const editorPaddingLeft = parseInt(
                editorStyle.getPropertyValue('padding-left').replace('px', '')
            );
            const editorPaddingTop =
                parseInt(
                    editorStyle
                        .getPropertyValue('padding-top')
                        .replace('px', '')
                ) + 4;

            // Get some measurements on spaces and tab.
            if (spaceWidth === null || tabWidth === null) {
                const spaceElement = editorView.querySelector(
                    `.space[data-id="${token.id}"]`
                );
                if (spaceElement === null) return;
                const spaceText = spaceElement.innerHTML;
                spaceElement.innerHTML = SPACE_HTML;
                spaceWidth = spaceElement.getBoundingClientRect().width;
                spaceElement.innerHTML = TAB_HTML;
                tabWidth = spaceElement.getBoundingClientRect().width;
                spaceElement.innerHTML = spaceText;
            }

            // Find the right side of token just prior to the current one that has this space.
            const priorToken = $caret.source.getNextToken(token, -1);
            const priorTokenView =
                priorToken === undefined
                    ? null
                    : editorView.querySelector(
                          `.token-view[data-id="${priorToken.id}"]`
                      );
            const priorTokenViewRect = priorTokenView?.getBoundingClientRect();
            let priorTokenRight =
                priorTokenViewRect === undefined
                    ? editorPaddingLeft
                    : priorTokenViewRect.right -
                      viewportRect.left +
                      viewport.scrollLeft;
            let priorTokenTop =
                priorTokenViewRect === undefined
                    ? editorPaddingTop
                    : priorTokenViewRect.top -
                      viewportRect.top +
                      viewport.scrollTop;

            let spaces: undefined | number;
            let tabs: undefined | number;

            let leftOffset = 0;

            // 1) Trailing space (the caret is before the first newline)
            if (spaceBefore.indexOf('\n') < 0) {
                // Count the number of spaces prior to the next newline.
                spaces = spaceBefore.split(' ').length - 1;
                tabs = spaceBefore.split('\t').length - 1;

                // Place the caret to the right of the prior token, {spaces} after.
                leftOffset = priorTokenRight;
                spaceTop = priorTokenTop;
            }
            // 2) Empty line (there is a newline before and after the current position)
            else if (
                spaceBefore.indexOf('\n') >= 0 &&
                spaceAfter.indexOf('\n') >= 0
            ) {
                // Place the caret's top at {tokenHeight} * {number of new lines prior}
                spaceTop =
                    priorTokenTop +
                    (spaceBefore.split('\n').length - 1) * lineHeight;

                // Place the caret's left the number of spaces on this line
                const beforeLines = spaceBefore.split('\n');
                const spaceOnLine = beforeLines[beforeLines.length - 1];

                spaces = spaceOnLine.split(' ').length - 1;
                tabs = spaceOnLine.split('\t').length - 1;
            }
            // 3) Preceding space (the caret is after the last newline)
            else {
                // Get the last line of spaces.
                const spaceLines = explicitSpace.split('\n');
                let spaceOnLastLine = spaceLines[spaceLines.length - 1];
                // Truncate everything on the last line of spaces after the current position of the caret.
                spaceOnLastLine = spaceOnLastLine.substring(
                    0,
                    spaceOnLastLine.length - (explicitSpace.length - spaceIndex)
                );

                // If there's preferred space after the explicit space, and we're on the last line of explicit space, include it.
                if (explicitSpace.length - spaceIndex === 0) {
                    spaceOnLastLine += $caret.source.spaces.getAdditionalSpace(
                        token,
                        Spaces.getPreferredPrecedingSpace(
                            $caret.source.root,
                            $caret.source.spaces.getSpace(token),
                            token
                        ) ?? ''
                    );
                }

                // Compute the spaces prior to the caret on this line.
                spaces = spaceOnLastLine.split(' ').length - 1;
                tabs = spaceOnLastLine.split('\t').length - 1;

                spaceTop = tokenTop;
            }

            return {
                left: `${
                    (leftOffset === 0 ? editorPaddingLeft : leftOffset) +
                    spaces * spaceWidth +
                    tabs * tabWidth
                }px`,
                top: `${spaceTop}px`,
                height: `${tokenHeight}px`,
                bottom: spaceTop + tokenHeight,
            };
        }
    }
</script>

<span
    class="caret {blink ? 'blink' : ''} {ignored ? 'ignored' : ''}"
    class:node={$caret && $caret.isNode() && !$caret.isPlaceholder()}
    style={location === undefined
        ? 'display:none'
        : `left: ${location.left}; top: ${location.top}; height: ${location.height};`}
    bind:this={element}
/>

<style>
    .caret {
        position: absolute;
        width: 2px;
        background-color: var(--wordplay-foreground);
    }

    .node {
        visibility: hidden;
    }

    .caret.blink {
        animation: blink-animation 0.5s steps(2, start) infinite;
    }

    :global(.animated) .caret.ignored {
        animation: shake 1;
        animation-duration: 200ms;
    }

    @keyframes blink-animation {
        to {
            visibility: hidden;
        }
    }
</style>
