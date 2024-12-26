<script lang="ts">
    import { type Snippet } from 'svelte';
    interface Props {
        children: Snippet;
        compact?: boolean;
    }

    let { children, compact: compact = false }: Props = $props();
</script>

<h2 class:compact>{@render children()}</h2>

<style>
    h2 {
        font-size: min(6vw, 20pt);
        margin-block-start: 1.5em;
        margin-block-end: var(--wordplay-spacing);
    }
    .compact {
        font-size: min(4vw, 16pt);
        margin: 0;
    }
</style>
