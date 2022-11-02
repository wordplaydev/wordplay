<script lang="ts">
    import { afterUpdate, getContext } from "svelte";
    import type { Writable } from "svelte/store";
    import type Caret from "../models/Caret";
    import Token, { TAB_WIDTH } from "../nodes/Token";
    import TokenType from "../nodes/TokenType";
    import { PLACEHOLDER_SYMBOL } from "../parser/Tokenizer";

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
            let spaceIndex = $caret.source.getTokenSpaceIndex(token);
            let lastIndex = $caret.source.getTokenLastIndex(token);
            let textIndex = $caret.source.getTokenTextIndex(token);

            // Compute where the caret should be placed. Place it if...
            caretIndex = 
                // Don't show the caret if the program is evaluating.
                $caret.source.evaluator.isDone() &&
                // Only show the caret if it's pointing to a number
                typeof $caret.position === "number" &&
                // The position can be anywhere after after the first glyph of the token, up to and including after the token's last character,
                // or the end token of the program.
                (
                    (token.is(TokenType.END) && $caret.isEnd()) ||
                    (
                        // It must be after the start OR at the start and not whitespace
                        ($caret.position >= spaceIndex || ($caret.position === spaceIndex && (spaceIndex === 0 || !$caret.isSpace($caret.source.getCode().at(spaceIndex) ?? '')))) && 
                        // ... and it must be before the end OR at the end and either the very end or at whitespace.
                        $caret.position <= lastIndex
                    )
                ) ?
                    // The offset at which to render the token is the caret in it's text.
                    // If the caret position is on a newline or tab, then it will be negative.
                    $caret.position - textIndex : 
                    undefined;

        }
    }

    // After we render, update the caret position.
    afterUpdate(() => {

        // Start assuming no position.
        location = undefined;

        // No caret view? No caret.
        if(caretElement === undefined) return;

        // Find views, and if any are missing, bail.
        const editorView = caretElement.parentElement;
        if(editorView === null) return;

        const viewport = editorView.parentElement;
        if(viewport === null) return;
        const viewportRect = viewport.getBoundingClientRect();

        const viewportXOffset = -viewportRect.left + viewport.scrollLeft;
        const viewportYOffset = -viewportRect.top + viewport.scrollTop;

        // If the caret is a node and it's a placeholder, then position a caret in it's center
        if($caret.position instanceof Token && $caret.position.getText() === PLACEHOLDER_SYMBOL) {

            const tokenView = editorView.querySelector(`.token-view[data-id="${$caret.position.id}"]`);
            if(tokenView === null) return;
            const tokenViewRect = tokenView.getBoundingClientRect();

            location = {
                left: `${tokenViewRect.left + viewportXOffset + tokenViewRect.width / 2}px`,
                top: `${tokenViewRect.top + viewportYOffset}px`,
                height: `${tokenViewRect.height}px`,
                bottom: tokenViewRect.bottom + viewportYOffset
            }
            return;

        }

        // No token? No caret.
        if(token === undefined) return;

        // No index to render? No caret.
        if(caretIndex === undefined) return;

        const tokenView = editorView.querySelector(`.token-view[data-id="${token.id}"]`);
        if(tokenView === null) return;

        const textElement = tokenView.querySelector(".text");
        if(textElement === null) return;

        // Figure out where the token view is, so we can properly offset the caret position in the editor.
        const tokenViewRect = tokenView.getBoundingClientRect();

        let tokenLeft = tokenViewRect.left + viewportXOffset;
        let tokenTop = tokenViewRect.top + viewportYOffset;

        // To compute line height, find two tokens on adjacent lines and difference their tops.
        const tokenViews = editorView.querySelectorAll(".Token");
        let firstTokenView: Element | undefined = undefined;
        let firstTokenViewAfterLineBreak: Element | undefined = undefined;
        let lineBreakCount: number | undefined = undefined;
        for(const tokenView of tokenViews) {
            if(firstTokenView === undefined) 
                firstTokenView = tokenView;
            const lineBreaks = tokenView.querySelectorAll("br");
            if(lineBreaks.length > 0) {
                firstTokenViewAfterLineBreak = tokenView;
                lineBreakCount = lineBreaks.length;
                break;
            }
        }

        let tokenHeight = tokenViewRect.height;
        let lineHeight;

        if(firstTokenView && firstTokenViewAfterLineBreak && lineBreakCount) {
            lineHeight = (firstTokenViewAfterLineBreak.getBoundingClientRect().top - firstTokenView.getBoundingClientRect().top ) / lineBreakCount;
        }
        else {
            lineHeight = tokenViewRect.height;
        }

        // Is the caret in the text, and not the whitespace?
        if(caretIndex > 0) {

            // Measure the width of the text at this index, if we haven't already.
            let widthAtCaret = undefined;
            // Trim the text to the position
            const trimmedText = token.text.substring(0, caretIndex).toString();
            // Get the text node of the token view
            const textNode = textElement.childNodes[0];
            // Create a trimmed node, but replace spaces in the trimmed text with visible characters so that they are included in measurement.
            const tempNode = document.createTextNode(trimmedText.replaceAll(" ", "·"));
            // Temporarily replace the node
            textNode.replaceWith(tempNode);
            // Get the text element's new width
            widthAtCaret = textElement.getBoundingClientRect().width;
            console.log("Width at caret is " + widthAtCaret);
            // Restore the text node
            tempNode.replaceWith(textNode);

            // Set the left of the caret at the measured width.
            location = {
                left: `${tokenLeft + widthAtCaret}px`,
                top: `${tokenTop}px`,
                height: `${tokenHeight}px`,
                bottom: tokenTop + tokenViewRect.height
            }
        }
        // If the caret is in the preceding space, compute the top/left.
        else {

            // Three cases to handle...
            //   1) The caret is in space trailing a line (including just at the end of the line, just before a newline).
            //   2) The caret is somewhere on an empty line.
            //   3) The caret is in the space preceding a token.
            // Figure out which three of this is the case, then position accordingly.

            const spaceIndex = token.space.length + caretIndex;
            const spaceBefore = token.space.substring(0, spaceIndex);
            const spaceAfter = token.space.substring(spaceIndex);

            let spaceLeft: string;
            let spaceTop: number;

            const editorPaddingLeft = parseInt(window.getComputedStyle(editorView).getPropertyValue('padding-left').replace("px", ""));
            const editorPaddingTop = parseInt(window.getComputedStyle(editorView).getPropertyValue('padding-top').replace("px", ""))

            // Find the right side of token just prior to the current one that has this space.
            const priorToken = $caret.source.getNextToken(token, -1);
            const priorTokenView = priorToken === undefined ? null : editorView.querySelector(`.token-view[data-id="${priorToken.id}"]`);
            const priorTokenViewRect = priorTokenView?.getBoundingClientRect();
            let priorTokenRight = priorTokenViewRect === undefined ? 
                editorPaddingLeft : 
                priorTokenViewRect.right - viewportRect.left + viewport.scrollLeft;
            let priorTokenTop = priorTokenViewRect === undefined ? 
                editorPaddingTop : 
                priorTokenViewRect.top - viewportRect.top + viewport.scrollTop;

            // 1) Trailing space (the caret is before the first newline)
            if(spaceBefore.indexOf("\n") < 0) {
                // Count the number of spaces prior to the next newline.
                const spaces = spaceBefore.split(" ").length - 1 + (spaceBefore.split("\t").length - 1) * TAB_WIDTH;

                // Place the caret to the right of the prior token, {spaces} after.
                spaceLeft = `calc(${priorTokenRight}px + ${spaces}ch)`;
                spaceTop = priorTokenTop;

            }
            // 2) Empty line (there is a newline before and after the current position)
            else if(spaceBefore.indexOf("\n") >= 0 && spaceAfter.indexOf("\n") >= 0) {
                // Place the caret's top at {tokenHeight} * {number of new lines prior}
                spaceTop = priorTokenTop + (spaceBefore.split("\n").length - 1) * lineHeight;

                // Place the caret's left the number of spaces on this line
                const beforeLines = spaceBefore.split("\n");
                const spaceOnLine = beforeLines[beforeLines.length - 1];
                const spaces = spaceOnLine.split(" ").length - 1 + (spaceOnLine.split("\t").length - 1) * TAB_WIDTH;

                spaceLeft = `calc(${editorPaddingLeft}px + ${spaces}ch)`;

            }
            // 3) Preceding space (the caret is after the last newline)
            else {
                // Get the last line of spaces.
                const spaceLines = token.space.split("\n");
                let spaceOnLastLine = spaceLines[spaceLines.length - 1];
                // Truncate the last line of spaces after the current position of the caret.
                spaceOnLastLine = spaceOnLastLine.substring(0, spaceOnLastLine.length - (token.space.length - spaceIndex));
                // Compute the spaces prior to the caret on this line.
                const spaces = spaceOnLastLine.split(" ").length - 1 + (spaceOnLastLine.split("\t").length - 1) * TAB_WIDTH;

                spaceTop = tokenTop;
                spaceLeft = `calc(${spaces === 0 ? editorPaddingLeft : 0}px + ${spaces}ch)`;
            }

            location = {
                left: spaceLeft,
                top: `${spaceTop}px`,
                height: `${tokenHeight}px`,
                bottom: spaceTop + tokenHeight
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