<script lang="ts">
    import type Token from "../nodes/Token";
    import { TAB_WIDTH, TokenKinds, TokenType } from "../nodes/Token";
    import { caret } from "../models/stores";
    import keyboardIdle from "../models/KeyboardIdle";

    export let node: Token;

    let element: HTMLElement;
    
    // A cache of view widths at different positions, since this is expensive to compute.
    let caretPositions: Record<number, number> = {};

    $: kind = node.types[0] !== undefined ? TokenKinds.get(node.types[0]) : "default";

    // Compute where the caret should be placed. Place it if...
    $: caretIndex = 
        $caret !== undefined &&
        typeof $caret.position === "number" &&
        // This token contains the caret position
        $caret.between(node.getWhitespaceIndex(), node.getLastIndex()) &&
        // This isn't the end token, or it is, and it either has whitespace or the code is the empty string.
        (!node.is(TokenType.END) || ($caret.project.code.getLength() === 0 || node.whitespace.length > 0)) ? 
            // The offset at which to render the token is the caret in it's text.
            // If the caret position is on a newline or tab, then it will be negative.
            $caret.position - node.getTextIndex() : 
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
                    const textElement = element?.querySelector(".text");
                    if(textElement) {
                        const trimmedText = node.text.substring(0, caretIndex).toString();
                        const textNode = textElement.childNodes[0];
                        const tempNode = document.createTextNode(trimmedText);
                        textNode.replaceWith(tempNode);
                        widthAtCaret = element.getBoundingClientRect().width;
                        tempNode.replaceWith(textNode);
                        caretPositions[caretIndex] = widthAtCaret;
                    }
                }

                caretLeft = widthAtCaret === undefined ? `${caretIndex}ch` : `${widthAtCaret}px`;
                caretTop = `auto`;
            }
            // If the caret is in whitespace, compute the top/left based on the pattern whitespace sequence.
            else if($caret?.isIndex()) {
                // Track an index starting at wherever the caret is.
                let caretIndex = $caret.getIndex();
                if(caretIndex) {

                    // Where in the whitespace is the caret?
                    let whitespaceIndex = caretIndex - node.getWhitespaceIndex();
                    let index = 0;
                    let row = 0;
                    let col = 0;
                    while(index < whitespaceIndex && index < node.whitespace.length) {
                        const char = node.whitespace.charAt(index);
                        if(char === "\n") {
                            row++;
                            col = 0;
                        }
                        else if(char === " ") 
                            col++;
                        else if(char === "\t")
                            col += TAB_WIDTH;
                        index++;
                    }

                    // If there's trailing whitespace at the end of a line, we need to account for it's width
                    // to ensure the caret appears properly offset from the end of the line.
                    if(node.whitespace.charAt(0) !== "\n" && row === 0) {
                        let index = node.getWhitespaceIndex() - 1;
                        let count = 0;
                        while(index > 0 && $caret.project.code.at(index) !== "\n") { 
                            const char = $caret.project.code.at(index);
                            count = count + (char === "\t" ? TAB_WIDTH : 1); 
                            index--;
                        }
                        col += count;
                    }

                    const top = -(node.newlines - row) * 1.4;
                    const left = -(node.precedingSpaces - col);

                    caretLeft = `${left}ch`;
                    caretTop = `${top}em`;
                }
            }
        }
    }

    // Place the caret when the token is clicked on.
    function handleClick(event: MouseEvent) {
        if($caret !== undefined && event.target instanceof Element && event.currentTarget instanceof Element) {
            // The mouse event's offset is relative to what was clicked on, not the element handling the click, so we have to compute the real offset.
            const targetRect = event.target.getBoundingClientRect();
            const tokenRect = element.getBoundingClientRect();
            const offset = event.offsetX + (targetRect.left - tokenRect.left);
            caret.set($caret.withPosition(node.getTextIndex() + (tokenRect.width === 0 ? 0 : Math.round(node.getTextLength() * (offset / tokenRect.width)))));
            event.stopPropagation();
        }
        // Prevent the OS from giving the document body focus.
        event.preventDefault();
    }

</script>


{#if node.newlines > 0 ? "newline" : ""}{@html "<br/>".repeat(node.newlines)}{/if}<span 
    class="token-view token-{kind} {$caret?.position === node ? "selected" : ""}" 
    style="color: {`var(--token-category-${kind})`}; margin-left: {node.precedingSpaces}ch"
    on:mousedown={handleClick}
    data-start={node.getWhitespaceIndex()}
    data-end={node.getLastIndex()}
    data-index={node.getTextIndex()}
    data-length={node.getTextLength()}
    data-whitespace={node.whitespace}
    data-newlines={node.newlines}
    data-id={node.id}
    bind:this={element}
><span class="text">{ node.text.toString() }</span>{#if caretLeft !== undefined && caretTop !== undefined}<span class="caret {$keyboardIdle ? "blink" : ""}" style="left: {caretLeft}; top: {caretTop};"></span>{/if}
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