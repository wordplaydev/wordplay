<script lang="ts">
    import type { Snippet } from 'svelte';

    const { children, error = false }: { children: Snippet; error?: boolean } =
        $props();
</script>

<div class="message" class:error class:saturated-surface={error}>
    {@render children()}
</div>

<style>
    .message {
        padding: var(--wordplay-spacing);
        height: 100%;
    }

    /* Orange is a luminance match for the focus ring, and callers put
       Buttons in here, so the error variant takes `saturated-surface`
       (app.html) to give them a second band. */
    .error {
        background: var(--wordplay-error);
        color: var(--wordplay-background);
    }
</style>
