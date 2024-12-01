<script lang="ts">
    interface Props {
        center?: boolean;
        children?: import('svelte').Snippet;
        id?: string | undefined;
    }

    let { center = false, id = undefined, children }: Props = $props();
</script>

<div class="note" {id} class:center>{@render children?.()}</div>

<style>
    div {
        font-style: italic;
        font-size: var(--wordplay-small-font-size);
        color: var(--wordplay-header);
    }

    .center {
        text-align: center;
    }
</style>
