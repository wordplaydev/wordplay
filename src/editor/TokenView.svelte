<script lang="ts">
    import type Token from "../nodes/Token";
    import { TokenKinds } from "../nodes/Token";
    import { caret } from "../models/stores";

    export let node: Token;

    const type = node.types[0];
    const kind = type !== undefined ? TokenKinds.get(type) : "default";
    const precedingSpace = node.space === " ";

    $: caretPosition = $caret !== undefined && typeof $caret.position === "number" && $caret.between(node.index, node.index + node.text.length) ? $caret.position - node.index + (precedingSpace ? 1 : 0) : undefined;

</script>

<span class="token-view token-{kind} token-{type}" style="color: {`var(--token-category-${kind})`}">{#if precedingSpace}<span>&nbsp;</span>{/if}{ node.text }{#if caretPosition !== undefined}<span class="caret" style="left: {caretPosition}ch"></span>{/if}</span>

<style>

    .token-view {
        display: inline-block;
        font-family: "Noto Sans Mono", monospace;
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

    .token-view:hover {
        cursor: text;
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

</style>