<script lang="ts">
    import { afterUpdate, getContext } from "svelte";
    import type { Writable } from "svelte/store";
    import type Caret from "../models/Caret";
    import { TAB_WIDTH } from "../nodes/Token";
    import TokenType from "../nodes/TokenType";

    type CaretPosition = { top: string, left: string, height: string, bottom: number };

    export let blink: boolean;

    // The current location of the caret.
    export let location: CaretPosition | undefined = undefined;

    // The caret of the editor that contains this view.
    $: caret = getContext<Writable<Caret>>("caret");

    // The HTMLElement rendering this view.
    let caretElement: HTMLElement;

    // The current token we're on.
    $: token = $caret.getToken();

    // The index we should render
    let caretIndex: number | undefined = undefined;

    // Whenever the caret changes, update the index we should render.
    $: {
        if(token !== undefined) {
            // Get some of the token's metadata
            let whitespaceIndex = token.getWhitespaceIndex();
            let lastIndex = token.getLastIndex();
            let textIndex = token.getTextIndex();

            // Compute where the caret should be placed. Place it if...
            caretIndex = 
                // Don't show the caret if the program is evaluating.
                $caret.source.evaluator.isDone() &&
                // Only show the caret if it's pointing to a number
                typeof $caret.position === "number" &&
                // All of these have to be numbers
                whitespaceIndex !== undefined &&
                lastIndex !== undefined &&
                textIndex !== undefined &&
                // The position can be anywhere after after the first glyph of the token, up to and including after the token's last character,
                // or the end token of the program. This ensures that there's always a token responsible for rendering a caret, but never two.
                (
                    (token.is(TokenType.END) && $caret.isEnd()) ||
                    (
                        // It must be after the start OR at the start and not whitespace
                        ($caret.position > whitespaceIndex || ($caret.position === whitespaceIndex && (whitespaceIndex === 0 || !$caret.isWhitespace($caret.source.getCode().at(whitespaceIndex) ?? '')))) && 
                        // ... and it must be before the end OR at the end and either the very end or at whitespace.
                        $caret.position <= lastIndex
                    )
                ) ?
                    // The offset at which to render the token is the caret in it's text.
                    // If the caret position is on a newline or tab, then it will be negative.
                    $caret.position - textIndex : 
                    undefined;

            if(caretIndex === undefined) 
                console.log("Index is " + caretIndex);

        }
    }

    // After we render, update the caret position.
    afterUpdate(() => {

        // Start assuming no position.
        location = undefined;

        // No token? No caret.
        if(token === undefined) return;

        // No index to render? No caret.
        if(caretIndex === undefined) return;

        // No caret view? No caret.
        if(caretElement === undefined) return;

        // Find views, and if any are missing, bail.
        const editorView = caretElement.parentElement;
        if(editorView === null) return;

        const viewport = editorView.parentElement;
        const tokenView = editorView.querySelector(`.token-view[data-id="${token.id}"]`);
        if(viewport === null || tokenView === null) return;

        const textElement = tokenView.querySelector(".text");
        if(textElement === null) return;

        // Figure out where the token view is, so we can properly offset the caret position in the editor.
        const tokenViewRect = tokenView.getBoundingClientRect();
        const viewportRect = viewport.getBoundingClientRect();

        let tokenLeft = tokenViewRect.left - viewportRect.left + viewport.scrollLeft;
        let tokenTop = tokenViewRect.top - viewportRect.top + viewport.scrollTop;

        // Is the caret in the text, and not the whitespace?
        if(caretIndex >= 0) {

            // Measure the width of the text at this index, if we haven't already.
            let widthAtCaret = undefined;
            // Trim the text to the position
            const trimmedText = token.text.substring(0, caretIndex).toString();
            // Get the text node of the token view
            const textNode = textElement.childNodes[0];
            // Create a trimmed node
            const tempNode = document.createTextNode(trimmedText);
            // Temporarily replace the node
            textNode.replaceWith(tempNode);
            // Get the text element's new width
            widthAtCaret = textElement.getBoundingClientRect().width;
            // Restore the text node
            tempNode.replaceWith(textNode);

            // Set the left of the caret at the measured width.
            location = {
                left: `${tokenLeft + widthAtCaret}px`,
                top: `${tokenTop}px`,
                height: `${tokenViewRect.height}px`,
                bottom: tokenTop + tokenViewRect.height
            }
        }
        // If the caret is in whitespace, compute the top/left based on the pattern whitespace sequence.
        else {

            let whitespaceIndex = token.getWhitespaceIndex();

            // Track an index starting at wherever the caret is.
            let caretIndex = $caret.getIndex();
            const whitespace = token.getWhitespace();
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
                let tokenHeight = tokenView?.getBoundingClientRect().height;
                const lineBreak = tokenView?.closest(".editor")?.querySelector("br");
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

                const top = tokenTop - ((token.newlines - row) * (tokenHeight ?? 16) - 1);

                location = {
                    left: `calc(${tokenLeft}px - ${token.precedingSpaces - col}ch)`,
                    top: `${top}px`,
                    height: `${tokenHeight}px`,
                    bottom: top + tokenHeight
                }
            }
        }

    });

</script>

<span 
    class="caret {blink ? "blink" : ""}"
    style={location === undefined ? "display:none" : `left: ${location.left}; top: ${location.top}; height: ${location.height};`}
    bind:this={caretElement}
/>

<style>
    .caret {
        position: absolute;
        width: 2px;
        background-color: var(--color-black);
        z-index: 2;
    }

    .caret.blink {
        animation: blink-animation 1s steps(2, start) infinite;
    }

    @keyframes blink-animation {
        to { visibility: hidden; }       
    }
</style>