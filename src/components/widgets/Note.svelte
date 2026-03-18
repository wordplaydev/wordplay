<script lang="ts">
    import type { Snippet } from 'svelte';

    interface Props {
        center?: boolean;
        children?: Snippet;
        id?: string | undefined;
        inline?: boolean;
    }

    let {
        center = false,
        id = undefined,
        children,
        inline = false,
    }: Props = $props();
</script>

<div class="note" {id} class:center class:inline>{@render children?.()}</div>

<style>
    div {
        font-style: italic;
        font-size: var(--wordplay-small-font-size);
        color: var(--wordplay-header);
        font-weight: var(--wordplay-font-weight);
    }

    .center {
        text-align: center;
    }

    .inline {
        display: inline;
    }
</style>
