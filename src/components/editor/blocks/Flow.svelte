<script lang="ts">
    import type { Snippet } from 'svelte';

    interface Props {
        children: Snippet;
        direction: 'row' | 'column';
        indent?: boolean;
    }

    let { children, direction, indent = false }: Props = $props();
</script>

<div class={[indent, direction]}>
    {@render children()}
</div>

<style>
    div {
        gap: var(--wordplay-spacing-half);
    }

    .row {
        display: flex;
        flex-direction: row;
    }

    .row.indent {
        margin-inline-start: 1em;
    }

    .column {
        flex-direction: column;
        align-items: start;
    }
</style>
