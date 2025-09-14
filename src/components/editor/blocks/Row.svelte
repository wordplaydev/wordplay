<script lang="ts">
    import type { Snippet } from 'svelte';

    interface Props {
        children: Snippet;
    }

    let { children }: Props = $props();
</script>

<div class="row">
    {@render children()}
</div>

<style>
    .row {
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing-half);
        align-items: baseline;
    }
</style>
