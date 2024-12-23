<script lang="ts">
    import type { Snippet } from 'svelte';

    let { children }: { children: Snippet } = $props();
</script>

<p>{@render children()}</p>

<style>
    p {
        text-align: center;
    }
</style>
