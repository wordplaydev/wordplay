<script lang="ts">
    import type Token from "../nodes/Token";
    import { TokenKinds, TokenType } from "../nodes/Token";
    import { caret } from "../models/stores";
    import keyboardIdle from "../models/KeyboardIdle";

    export let node: Token;

    const TAB_WIDTH = 2;
    const type = node.types[0];
    const end = type === TokenType.END;
    const kind = type !== undefined ? TokenKinds.get(type) : "default";
    const spaceStart = node.index - node.spaces;

    // Compute where the caret should be placed. Place it if...
    $: caretIndex = 
        // The caret store exists
        $caret !== undefined && 
        // The caret position is a number, not a node
        typeof $caret.position === "number" && 
        // This token contains the caret position
        $caret.between(node.getSpaceIndex(), node.getLastIndex()) &&
        // This isn't the end token, or it is, and it either has whitespace or the code is the empty string.
        (end && ($caret.project.code.length === 0 || node.space.length > 0) || !end) ? 
            // Otherwise, the caretThe offset at which to render the token is the caret position, minus the start of the token's spaces.
            // If the caret position is on a newline or tab, then it will be negative.
            $caret.position - spaceStart : 
            undefined;

    // Compute the left and top positions of the caret based on the caretPosition.
    let caretLeft: undefined | string = undefined;
    let caretTop: undefined | string = undefined;
    $: { 
        caretLeft = undefined;
        caretTop = undefined;
        if(caretIndex !== undefined) {
            if(caretIndex >= 0) {
                caretLeft = `${caretIndex}ch`;
                caretTop = `auto`;
            }
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
            caret.set($caret.withPosition(node.getSpaceIndex() + node.tabs + node.newlines + Math.round((node.spaces + node.getTextLength()) * (offset / tokenRect.width))));
            event.stopPropagation();
        }
    }

</script>


{#if node.newlines > 0 ? "newline" : ""}{@html "<br/>".repeat(node.newlines)}{/if}<span 
    class="token-view token-{kind} {$caret?.position === node ? "selected" : ""}" 
    style="color: {`var(--token-category-${kind})`}; margin-left: {node.tabs * TAB_WIDTH}ch"
    on:mousedown={handleClick} 
    data-index={node.getTextIndex()}
    data-length={node.getTextLength()}
>{#if node.spaces > 0}<span class="space {caretIndex === undefined ? "" : "visible"}">·</span>{/if}<span class="text">{ node.text }</span>{#if caretLeft !== undefined && caretTop !== undefined}<span class="caret {$keyboardIdle ? "blink" : ""}" style="left: {caretLeft}; top: {caretTop};"></span>{/if}
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