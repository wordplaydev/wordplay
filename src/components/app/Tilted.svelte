<script lang="ts">
    interface Props {
        capitalized?: boolean;
        children?: import('svelte').Snippet;
    }

    let { capitalized = true, children }: Props = $props();
</script>

<span class:capitalized>{@render children?.()}</span>

<style>
    span {
        display: inline-block;
        font-family: var(--wordplay-app-font);
        color: var(--wordplay-header);
        margin-block-end: 0;
        font-weight: bold;
        text-align: start;
        transform: rotate(-1deg);
    }

    .capitalized {
        text-transform: capitalize;
    }
</style>
