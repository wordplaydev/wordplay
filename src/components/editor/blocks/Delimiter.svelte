<script lang="ts">
    import type Token from '@nodes/Token';
    import NodeView, { type Format } from '../nodes/NodeView.svelte';

    interface Props {
        token: Token | undefined;
        format: Format;
    }

    let { token, format }: Props = $props();
</script>

{#if token}
    <div class="delimiter"><NodeView node={token} {format}></NodeView></div>
{/if}

<style>
    .delimiter {
        font-size: var(--wordplay-font-size);
    }
</style>
