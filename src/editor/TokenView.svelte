<script lang="ts">
    import type Token from "../nodes/Token";
    import { TokenKinds, TokenType } from "../nodes/Token";
    import { caret } from "../models/stores";
    import keyboardIdle from "../models/KeyboardIdle";

    export let node: Token;

    let element: HTMLElement;
    
    // A cache of view widths at different positions, since this is expensive to compute.
    let caretPositions: Record<number, number> = {};

    const TAB_WIDTH = 2;
    const type = node.types[0];
    const end = type === TokenType.END;
    const kind = type !== undefined ? TokenKinds.get(type) : "default";

    // Compute where the caret should be placed. Place it if...
    $: caretIndex = 
        // The caret store exists
        $caret !== undefined && 
        // The caret position is a number, not a node
        typeof $caret.position === "number" && 
        // This token contains the caret position
        $caret.between(node.getWhitespaceIndex(), node.getLastIndex()) &&
        // This isn't the end token, or it is, and it either has whitespace or the code is the empty string.
        (end && ($caret.project.code.getLength() === 0 || node.whitespace.length > 0) || !end) ? 
            // Otherwise, the caretThe offset at which to render the token is the caret position, minus the start of the token's spaces.
            // If the caret position is on a newline or tab, then it will be negative.
            $caret.position - node.getSpaceIndex() : 
            undefined;

    // Compute the left and top positions of the caret based on the caretPosition.
    let caretLeft: undefined | string = undefined;
    let caretTop: undefined | string = undefined;
    $: { 
        caretLeft = undefined;
        caretTop = undefined;
        if(caretIndex !== undefined) {
            // If the caret is in the preceding spaces or text, compute the left position based on the index into the text.
            if(caretIndex >= 0) {
                // One strategy is to trim the text to only the text included, then measure the width in pixels, then restore it.
                let widthAtCaret = caretIndex in caretPositions ? caretPositions[caretIndex] : undefined;
                if(widthAtCaret === undefined) {
                    const spaceElement = element?.querySelector(".space");
                    const textElement = element?.querySelector(".text");
                    if(spaceElement && textElement) {
                        const trimmedSpace = "&nbsp;".repeat(Math.min(caretIndex, node.spaces));
                        const trimmedText = caretIndex < node.spaces ? "" : node.text.substring(0, caretIndex - node.spaces).toString();
                        spaceElement.innerHTML = trimmedSpace;
                        textElement.innerHTML = trimmedText;
                        widthAtCaret = element.getBoundingClientRect().width;
                        spaceElement.innerHTML = getSpaces();
                        textElement.innerHTML = node.text.toString();
                        caretPositions[caretIndex] = widthAtCaret;
                    }
                }

                caretLeft = widthAtCaret === undefined ? `${caretIndex}ch` : `${widthAtCaret}px`;
                caretTop = `auto`;
            }
            // If were in whitespace, compute the top/left based on the pattern of whitespace.
            else {
                // Track an index starting at the start of the spaces.
                let index = 0;
                let left = 0;
                let top = 0;

                // Subtract the width of the tab for each tab.
                for(let i = node.tabs; i > 0 && index !== caretIndex; i--) {
                    left -= TAB_WIDTH;
                    index--;
                }

                // If there are newlines, reset the left to 0 and subtract the number of new lines.
                if(node.newlines > 0 && index !== caretIndex) {
                    left = 0;
                    // Subtract the line height for every new line.
                    for(let i = node.newlines; i > 0 && index !== caretIndex; i--) {
                        top -= 1.4;
                        index--;
                    }
                }

                caretLeft = `${left}ch`;
                caretTop = `${top}em`;
            }
        }
    }

    // Place the caret when the token is clicked on.
    function handleClick(event: MouseEvent) {
        if($caret !== undefined && event.target instanceof Element && event.currentTarget instanceof Element) {
            // The mouse event's offset is relative to what was clicked on, not the element handling the click, so we have to compute the real offset.
            const targetRect = event.target.getBoundingClientRect();
            const tokenRect = event.currentTarget.getBoundingClientRect();
            const offset = event.offsetX + (targetRect.left - tokenRect.left);
            // Place the caret at the space or text assuming fixed width, but after any tabs or new lines.
            caret.set($caret.withPosition(node.getWhitespaceIndex() + node.tabs + node.newlines + Math.round(node.getSpaceAndTextLength() * (offset / tokenRect.width))));
            event.stopPropagation();
        }
    }

    function getSpaces() { return "·".repeat(node.spaces); }

</script>


{#if node.newlines > 0 ? "newline" : ""}{@html "<br/>".repeat(node.newlines)}{/if}<span 
    class="token-view token-{kind} {$caret?.position === node ? "selected" : ""}" 
    style="color: {`var(--token-category-${kind})`}; margin-left: {node.tabs * TAB_WIDTH}ch"
    on:mousedown={handleClick} 
    data-start={node.getWhitespaceIndex()}
    data-end={node.getLastIndex()}
    data-index={node.getTextIndex()}
    data-length={node.getTextLength()}
    data-whitespace={node.whitespace}
    data-spaces={node.spaces}
    data-newlines={node.newlines}
    bind:this={element}
>{#if node.spaces > 0}<span class="space {caretIndex === undefined ? "" : "visible"}">{getSpaces()}</span>{/if}<span class="text">{ node.text.toString() }</span>{#if caretLeft !== undefined && caretTop !== undefined}<span class="caret {$keyboardIdle ? "blink" : ""}" style="left: {caretLeft}; top: {caretTop};"></span>{/if}
</span>

<style>

    .token-view {
        display: inline-block;
        font-family: "Noto Sans Mono", "Noto Emoji", monospace;
        position: relative;
        cursor: text;

        --token-category-delimiter: var(--color-grey);
        --token-category-relation: var(--color-yellow);
        --token-category-share: var(--color-yellow);
        --token-category-eval: var(--color-blue);
        --token-category-docs: var(--color-purple);
        --token-category-literal: var(--color-blue);
        --token-category-name: var(--color-black);
        --token-category-type: var(--color-orange);
        --token-category-operator: var(--color-yellow);
        --token-category-unknown: var(--color-pink);
    }

    .token-view.newline {
        display: block;
    }

    .space {
        visibility: hidden;
    }

    .space.visible {
        visibility: visible;
        color: var(--color-lightgrey);
    }

    .text {
        display: inline-block;
    }

    .text:hover {
        outline: 1px solid var(--color-grey);
    }

    .token-delimiter .text {
        transform-origin: center;
        transform: scale(1.3, 1.3);
    }

    .caret {
        width: 2px;
        position: absolute;
        top: 0;
        height: 1.4em;
        background-color: var(--color-black);
        z-index: 1;
    }

    .blink {
        animation: blink-animation 1s steps(2, start) infinite;
    }

    @keyframes blink-animation {
        to { visibility: hidden; }       
    }

    .selected .text {
        outline: 2px solid var(--color-yellow);
    }

</style>