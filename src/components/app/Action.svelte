<script lang="ts">
    import { type Snippet } from 'svelte';
    interface Props {
        children: Snippet;
    }

    let { children }: Props = $props();
</script>

<div class="action">
    {@render children()}
</div>

<style>
    .action {
        min-width: 15em;
        width: calc(50% - var(--wordplay-spacing));
        padding: var(--wordplay-spacing);
        border: var(--wordplay-border-color) solid var(--wordplay-border-width);
        border-radius: var(--wordplay-border-radius);
        background: var(--wordplay-background);
        flex: 1 0 auto;
    }
</style>
