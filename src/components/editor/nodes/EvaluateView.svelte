<script lang="ts">
    import { getProject, getRoot } from '@components/project/Contexts';
    import Evaluate from '@nodes/Evaluate';
    import NodeSequenceView from '@components/editor/nodes/NodeSequenceView.svelte';
    import NodeView, { type Format } from '@components/editor/nodes/NodeView.svelte';

    interface Props {
        node: Evaluate;
        format: Format;
    }

    let { node, format }: Props = $props();

    // Get the function this corresponds to, so we can decide whether to offer an input trigger.
    const root = getRoot();
    const project = getProject();
    let context = $derived(
        root === undefined || root.root === undefined || $project === undefined
            ? undefined
            : $project.getNodeContext(root.root.root),
    );
    const fun = $derived(
        context === undefined ? undefined : node.getFunction(context),
    );

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

{#if format.block}
    <NodeView node={[node, 'fun']} {format} />
    <NodeView node={[node, 'types']} {format} empty="hide" />
    <NodeView node={[node, 'open']} {format} />
    <NodeSequenceView
        {node}
        {format}
        field="inputs"
        empty={fun !== undefined && fun.inputs.length > 0 ? 'label' : 'hide'}
        direction={vertical ? 'block' : 'inline'}
        wrap={!vertical}
        breaks={!vertical}
    />
    <NodeView node={[node, 'close']} {format} />
{:else}
    <NodeView node={[node, 'fun']} {format} /><NodeView
        node={[node, 'types']}
        {format}
    /><NodeView node={[node, 'open']} {format} /><NodeSequenceView
        {node}
        {format}
        field="inputs"
        empty="label"
    /><NodeView node={[node, 'close']} {format} />
{/if}
