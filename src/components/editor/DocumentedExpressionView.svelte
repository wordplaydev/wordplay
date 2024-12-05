<script lang="ts">
    import type DocumentedExpression from '@nodes/DocumentedExpression';
    import NodeView from './NodeView.svelte';
    import { getIsBlocks } from '@components/project/Contexts';

    interface Props {
        node: DocumentedExpression;
    }

    let { node }: Props = $props();

    const blocks = getIsBlocks();
</script>

{#if $blocks}
    <div class="column">
        <NodeView node={node.docs} /><NodeView node={node.expression} />
    </div>
{:else}
    <NodeView node={node.docs} /><NodeView node={node.expression} />
{/if}

<style>
    .column {
        display: flex;
        flex-direction: row;
    }
</style>
