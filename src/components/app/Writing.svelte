<script lang="ts">
    import { type Snippet } from 'svelte';
    import Page from '@components/app/Page.svelte';

    interface Props {
        children: Snippet;
        footer?: boolean;
        /** Widen the text column for pages that are primarily lists of previews,
         * so they have room for multiple grid columns. */
        wide?: boolean;
    }

    let { children, footer = true, wide = false }: Props = $props();
</script>

<Page {footer}>
    <div class="writing" class:wide>
        {@render children()}
    </div>
</Page>

<style>
    .writing {
        margin-inline-start: auto;
        margin-inline-end: auto;
        width: 70%;
        max-width: 40em;
        text-align: start;
        margin-block-start: 4em;
        margin-block-end: 4em;
    }

    .writing.wide {
        width: 90%;
        max-width: 72em;
    }

    :global(p:not(:last-of-type)) {
        margin-block-end: 1em;
    }
</style>
