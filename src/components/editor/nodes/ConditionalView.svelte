<script lang="ts">
    import type Conditional from '@nodes/Conditional';
    import Column from '../blocks/Column.svelte';
    import Row from '../blocks/Row.svelte';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: Conditional;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

{#if format.block}
    <Row>
        <NodeView node={node.condition} {format} /><NodeView
            node={node.question}
            {format}
        />
    </Row>
    <Column indent>
        <NodeView node={node.yes} {format} /><NodeView
            node={node.no}
            {format}
        /></Column
    >
{:else}
    <NodeView node={node.condition} {format} /><NodeView
        node={node.question}
        {format}
    /><NodeView node={node.yes} {format} /><NodeView node={node.no} {format} />
{/if}
