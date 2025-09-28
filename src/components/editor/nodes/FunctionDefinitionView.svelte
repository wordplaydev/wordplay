<script lang="ts">
    import type FunctionDefinition from '@nodes/FunctionDefinition';
    import Column from '../blocks/Column.svelte';
    import Row from '../blocks/Row.svelte';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: FunctionDefinition;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

{#if format.block}
    <NodeView node={[node, 'docs']} {format} empty="hide" /><NodeView
        node={[node, 'share']}
        {format}
        empty="hide"
    />
    <Row
        ><NodeView node={[node, 'fun']} {format} /><NodeView
            node={[node, 'names']}
            {format}
        /><NodeView node={[node, 'types']} {format} empty="hide" /><NodeView
            node={[node, 'open']}
            {format}
        /><NodeSequenceView
            {node}
            field="inputs"
            {format}
            empty="menu"
        /><NodeView node={[node, 'close']} {format} /><NodeView
            node={[node, 'dot']}
            {format}
        /><NodeView node={[node, 'output']} {format} empty="menu" />
    </Row>
    <Column indent>
        <NodeView node={[node, 'expression']} {format} />
    </Column>
{:else}
    <NodeView node={[node, 'docs']} {format} /><NodeView
        node={[node, 'share']}
        {format}
    /><NodeView node={[node, 'fun']} {format} /><NodeView
        node={[node, 'names']}
        {format}
    /><NodeView node={[node, 'types']} {format} /><NodeView
        node={[node, 'open']}
        {format}
    /><NodeSequenceView {node} field="inputs" {format} empty="menu" /><NodeView
        node={[node, 'close']}
        {format}
    /><NodeView node={[node, 'dot']} {format} /><NodeView
        node={[node, 'output']}
        {format}
    /><NodeView node={[node, 'expression']} {format} />
{/if}
