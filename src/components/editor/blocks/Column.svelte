<script lang="ts">
    import type { Snippet } from 'svelte';

    interface Props {
        children: Snippet;
        indent?: boolean;
    }

    let { children, indent = false }: Props = $props();
</script>

<div class="row" class:indent>
    {@render children()}
</div>

<style>
    .row {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing-half);
        align-items: start;
    }

    .row.indent {
        margin-inline-start: 2em;
    }
</style>
