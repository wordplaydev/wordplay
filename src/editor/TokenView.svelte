<script lang="ts">
    import type Token from "../nodes/Token";
    import { TokenKinds } from "../nodes/Token";
    import { caret } from "../models/stores";
    import keyboardIdle from "../models/KeyboardIdle";

    export let node: Token;

    const type = node.types[0];
    const kind = type !== undefined ? TokenKinds.get(type) : "default";
    $: precedingSpaces = node.space.split(" ").length - 1;
    $: caretPosition = $caret !== undefined && typeof $caret.position === "number" && $caret.between(node.getSpaceIndex(), node.getLastIndex()) ? $caret.position - node.index + precedingSpaces : undefined;

    // Place the caret when the token is clicked on.
    function handleClick(event: MouseEvent) {
        if($caret !== undefined && event.currentTarget instanceof Element)
            caret.set($caret.withPosition((node.getSpaceIndex()) + Math.round((precedingSpaces + node.getTextLength()) * (event.offsetX / event.currentTarget.getBoundingClientRect().width))));
    }

</script>

<span 
    class="token-view token-{kind} {$caret?.position === node ? "selected" : ""}" 
    on:mousedown={handleClick} 
    style="color: {`var(--token-category-${kind})`}"
>{#if precedingSpaces > 0}<span class="whitespace">{@html "&nbsp;".repeat(precedingSpaces)}</span>{/if}<span class="text">{ node.text }</span>{#if caretPosition !== undefined}<span class="caret {$keyboardIdle ? "blink" : ""}" style="left: {caretPosition}ch"></span>{/if}
</span>

<style>

    .token-view {
        display: inline-block;
        font-family: "Noto Sans Mono", "Noto Emoji", monospace;
        position: relative;

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

    .text:hover {
        cursor: text;
        outline: 1px solid var(--color-grey);
    }

    .token-delimiter {
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