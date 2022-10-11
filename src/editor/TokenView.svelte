<script lang="ts">
    import type Token from "../nodes/Token";
    import { TAB_WIDTH } from "../nodes/Token";
    import TokenType from "../nodes/TokenType";
    import { TokenCategories } from "./TokenCategories";
    import keyboardIdle from "../models/KeyboardIdle";
    import type Caret from "../models/Caret";
    import { getContext } from "svelte";
    import type { Writable } from "svelte/store";

    export let node: Token;

    let element: HTMLElement;
    
    // A cache of view widths at different positions, since this is expensive to compute.
    let caretPositions: Record<number, number> = {};

    let caret = getContext<Writable<Caret>>("caret");

    $: kind = node.types[0] !== undefined ? TokenCategories.get(node.types[0]) : "default";

    $: whitespaceIndex = node.getWhitespaceIndex();
    $: lastIndex = node.getLastIndex();
    $: textIndex = node.getTextIndex();

    // Compute where the caret should be placed. Place it if...
    $: caretIndex = 
        // Don't show the caret if the program is evaluating.
        $caret.source.evaluator.isDone() &&
        // Only show the caret if it's pointing to a number
        typeof $caret.position === "number" &&
        // All of these have to be numbers
        whitespaceIndex !== undefined &&
        lastIndex !== undefined &&
        textIndex !== undefined &&
        // If this is the end and the caret is on it
        (
            (node.is(TokenType.END) && $caret.isEnd()) ||
            $caret.between(whitespaceIndex, lastIndex)
        ) ?
            // The offset at which to render the token is the caret in it's text.
            // If the caret position is on a newline or tab, then it will be negative.
            $caret.position - textIndex : 
            undefined;

    // Compute the left and top positions of the caret based on the caretPosition.
    let caretLeft: undefined | string = undefined;
    let caretTop: undefined | string = undefined;
    $: { 
        caretLeft = undefined;
        caretTop = undefined;
        if(caretIndex !== undefined) {
            // Is the caret in the text?
            if(caretIndex >= 0) {
                // Measure the width of the text at this index, if we haven't already.
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
                        // We only cache this if it's not zero, or it's supposed to be zero.
                        // This accounts for some cases where the browser reports zero width.
                        if(widthAtCaret > 0 || caretIndex === 0)
                            caretPositions[caretIndex] = widthAtCaret;
                    }
                }

                // Set the left of the caret at the measured width.
                caretLeft = widthAtCaret === undefined ? `${caretIndex}ch` : `${widthAtCaret}px`;
                caretTop = `auto`;
            }
            // If the caret is in whitespace, compute the top/left based on the pattern whitespace sequence.
            else if($caret?.isIndex()) {

                // Track an index starting at wherever the caret is.
                let caretIndex = $caret.getIndex();
                const whitespace = node.getWhitespace();
                if(caretIndex !== undefined && whitespaceIndex !== undefined) {

                    // Where in the whitespace is the caret?
                    let whitespaceOffset = caretIndex - whitespaceIndex;
                    let index = 0;
                    let row = 0;
                    let col = 0;
                    while(index < whitespaceOffset && index < whitespace.length) {
                        const char = whitespace.charAt(index);
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

                    // Get the height of the element so we know how many lines to adjust.
                    // We measure the height of a 
                    let tokenHeight = element?.getBoundingClientRect().height;
                    const lineBreak = element?.closest(".editor")?.querySelector("br");
                    if(lineBreak !== null && lineBreak !== undefined) tokenHeight = lineBreak.getBoundingClientRect().height;

                    // If there's trailing whitespace at the end of a line (i.e. this whitespace ends with a newline), 
                    // we need to account for it's width to ensure the caret appears properly offset from the end of the line.
                    if(tokenHeight !== undefined && whitespace.charAt(0) !== "\n" && whitespace.length > 0 && whitespace.charAt(whitespace.length - 1) === "\n" && row === 0) {

                        let index = whitespaceIndex - 1;
                        let count = 0;
                        // Keep looping until we find a non-space, non-tab character.
                        while(index > 0 && $caret.getCode().at(index) !== "\n") { 
                            const char = $caret.getCode().at(index);
                            count = count + (char === "\t" ? TAB_WIDTH : 1); 
                            index--;
                        }
                        col += count;
                    }

                    const top = -(node.newlines - row) * (tokenHeight ?? 16) - 1;
                    const left = -(node.precedingSpaces - col);

                    caretLeft = `${left}ch`;
                    caretTop = `${top}px`;
                }
            }
        }
    }

</script>

{#if node.newlines > 0 ? "newline" : ""}{@html "<br/>".repeat(node.newlines)}{/if}<span 
    class="token-view token-{kind}" 
    style="color: {`var(--token-category-${kind})`}; margin-left: {node.precedingSpaces}ch"
    data-id={node.id}
    bind:this={element}
>
    <span class="text">{ node.text.toString() }</span>
    {#if caretLeft !== undefined && caretTop !== undefined}
        <span 
            class="caret {$keyboardIdle ? "blink" : ""}"
            style="left: {caretLeft}; top: {caretTop};"
        />
    {/if}
</span>

<style>

    .token-view {
        display: inline-block;
        font-family: var(--wordplay-code-font-face);
        font-size: var(--wordplay-font-size);
        position: relative;
        cursor: text;
        z-index: 1;

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
        position: absolute;
        top: 0;
        width: 2px;
        height: 100%;
        background-color: var(--color-black);
        z-index: 2;
    }

    .caret.blink {
        animation: blink-animation 1s steps(2, start) infinite;
    }

    @keyframes blink-animation {
        to { visibility: hidden; }       
    }

    .selected .text {
        outline: 2px solid var(--color-yellow);
    }

</style>