<script lang="ts">
    interface Props {
        children?: import('svelte').Snippet;
    }

    let { children }: Props = $props();
</script>

<span class="warning">{@render children?.()}</span>

<style>
    .warning {
        display: inline-block;
        background: var(--wordplay-highlight-color);
        color: var(--wordplay-background);
        border-radius: var(--wordplay-border-radius);
        padding: calc(var(--wordplay-spacing) / 2);
        font-size: medium;
    }
</style>
