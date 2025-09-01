<script lang="ts">
    import type { Snippet } from 'svelte';

    interface Props {
        children: Snippet;
        /** If true, an inline layout instead of block */
        block?: boolean;
        /** If true and not inline, indentation */
        indent?: boolean;
        /** The kind of style to render for the block */
        style?: 'back' | 'none' | 'definition' | 'evaluate';
    }

    let {
        children,
        block = false,
        indent = false,
        style = 'back',
    }: Props = $props();
</script>

<div class="block {style}" class:inline={!block} class:indent
    >{@render children()}</div
>

<style>
    .block {
        display: flex;
        flex-direction: column;
        gap: 2px;
        align-items: start;
        width: fit-content;
        height: fit-content;

        padding: calc(var(--wordplay-spacing) / 3)
            calc(var(--wordplay-spacing) / 2) calc(var(--wordplay-spacing) / 3)
            calc(var(--wordplay-spacing) / 2);
        box-shadow: var(--color-shadow) 0px 0px 4px;
        border-radius: var(--wordplay-border-radius);
    }

    .inline {
        flex-direction: row;
        align-items: baseline;
    }

    .indent {
        margin-inline-start: var(--wordplay-spacing);
    }

    .definition {
        border-inline-start: var(--wordplay-focus-width) solid var(--color-blue);
        border-top-left-radius: 0;
        border-bottom-left-radius: 0;
    }

    .evaluate {
        border-block-end: var(--wordplay-focus-width) solid var(--color-purple);
        border-bottom-left-radius: 0;
        border-bottom-right-radius: 0;
    }

    .none {
        padding: 0;
        box-shadow: none;
    }
</style>
