<script lang="ts">
    import type { Snippet } from 'svelte';

    interface Props {
        children: Snippet;
        direction: 'row' | 'column';
        indent?: boolean;
        wrap?: boolean;
    }

    let { children, direction, indent = false, wrap = false }: Props = $props();
</script>

<div class={['row', direction, { indent, wrap }]}>
    {@render children()}
</div>

<style>
    .row {
        display: flex;
        flex-direction: row;
        align-items: baseline;
    }

    .row.wrap {
        flex-wrap: wrap;
        row-gap: var(--wordplay-spacing-half);
    }

    .row.indent {
        /* scale: the block editor's indent, which scales with the creator's editor font size. */
        margin-inline-start: 1em;
    }

    .column {
        flex-direction: column;
        align-items: start;
    }
</style>
