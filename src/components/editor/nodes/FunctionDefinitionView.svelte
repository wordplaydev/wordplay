<script lang="ts">
    import type FunctionDefinition from '@nodes/FunctionDefinition';
    import Flow from '@components/editor/blocks/Flow.svelte';
    import NodeSequenceView from '@components/editor/nodes/NodeSequenceView.svelte';
    import NodeView, { type Format } from '@components/editor/nodes/NodeView.svelte';

    interface Props {
        node: FunctionDefinition;
        format: Format;
    }

    let { node, format }: Props = $props();

    /** Render inputs as a column when the source has newlines between any of
        them. A wrapping inline list forces its container to fill editor width
        because of flex-basis: 100% line breaks; a column fits its content. */
    let vertical = $derived(
        format.block &&
            format.spaces !== undefined &&
            node.inputs.some((v) =>
                format.spaces!.getSpace(v).includes('\n'),
            ),
    );
</script>

{#snippet docs()}
    <NodeView node={[node, 'docs']} {format} empty="menu" /><NodeView
        node={[node, 'share']}
        {format}
        empty="hide"
    />
{/snippet}

{#if format.block}
    {#if !node.docs.isEmpty()}{@render docs()}{/if}
    <Flow direction="row"
        >{#if node.docs.isEmpty()}{@render docs()}{/if}<NodeView
            node={[node, 'fun']}
            {format}
        /><NodeView node={[node, 'names']} {format} /><NodeView
            node={[node, 'types']}
            {format}
            empty="hide"
        /><NodeView node={[node, 'open']} {format} /><NodeSequenceView
            {node}
            field="inputs"
            {format}
            empty="menu"
            direction={vertical ? 'block' : 'inline'}
            wrap={!vertical}
            breaks={!vertical}
        /><NodeView node={[node, 'close']} {format} /><NodeView
            node={[node, 'dot']}
            {format}
            empty="hide"
        /><NodeView node={[node, 'output']} {format} />
    </Flow>
    <Flow direction="column" indent>
        <NodeView node={[node, 'expression']} {format} empty="label" />
    </Flow>
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
        empty="hide"
    /><NodeView node={[node, 'expression']} {format} />
{/if}
