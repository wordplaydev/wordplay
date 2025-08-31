<script lang="ts">
    import type DocumentedExpression from '@nodes/DocumentedExpression';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: DocumentedExpression;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

{#if format.block}
    <div class="column">
        <NodeView node={node.docs} {format} /><NodeView
            node={node.expression}
            {format}
        />
    </div>
{:else}
    <NodeView node={node.docs} {format} /><NodeView
        node={node.expression}
        {format}
    />
{/if}

<style>
    .column {
        display: flex;
        flex-direction: row;
    }
</style>
