<script lang="ts">
    import type { Snippet } from 'svelte';

    const { children, error = false }: { children: Snippet; error?: boolean } =
        $props();
</script>

<div class="message" class:error>{@render children()}</div>

<style>
    .message {
        padding: var(--wordplay-spacing);
        height: 100%;
    }

    .error {
        background: var(--wordplay-error);
        color: var(--wordplay-background);
    }
</style>
