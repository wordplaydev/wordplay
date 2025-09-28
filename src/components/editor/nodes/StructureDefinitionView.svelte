<script lang="ts">
    import type StructureDefinition from '@nodes/StructureDefinition';
    import Column from '../blocks/Column.svelte';
    import Row from '../blocks/Row.svelte';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: StructureDefinition;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

{#if format.block}
    <Column>
        <NodeView node={node.docs} {format} />
        <Row>
            <NodeView node={node.share} {format} /><NodeView
                node={node.type}
                {format}
            /><NodeView node={node.names} {format} /><NodeSequenceView
                {node}
                field="interfaces"
                {format}
            /><NodeView node={node.types} {format} /><NodeView
                node={node.open}
                {format}
            /><NodeSequenceView {node} field="inputs" {format} /><NodeView
                node={node.close}
                {format}
            />
        </Row>
        <Column indent><NodeView node={node.expression} {format} /></Column>
    </Column>
{:else}
    <NodeView node={node.docs} {format} /><NodeView
        node={node.share}
        {format}
    /><NodeView node={node.type} {format} /><NodeView
        node={node.names}
        {format}
    /><NodeSequenceView {node} field="interfaces" {format} /><NodeView
        node={node.types}
        {format}
    /><NodeView node={node.open} {format} /><NodeSequenceView
        {node}
        field="inputs"
        {format}
    /><NodeView node={node.close} {format} /><NodeView
        node={node.expression}
        {format}
    />
{/if}
