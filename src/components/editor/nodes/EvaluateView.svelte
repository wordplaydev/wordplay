<script lang="ts">
    import { getProject, getRoot } from '@components/project/Contexts';
    import Evaluate from '@nodes/Evaluate';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import NodeView, { type Format } from './NodeView.svelte';

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
        wrap
        breaks
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
