<script lang="ts">
    import type Token from '@nodes/Token';
    import NodeView from '../NodeView.svelte';

    interface Props {
        token: Token | undefined;
    }

    let { token }: Props = $props();
</script>

{#if token}
    <div class="delimiter"><NodeView node={token}></NodeView></div>
{/if}

<style>
    .delimiter {
        font-size: var(--wordplay-font-size);
    }
</style>
