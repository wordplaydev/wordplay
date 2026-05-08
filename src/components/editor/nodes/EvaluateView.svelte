<script lang="ts">
    import { getProject, getRoot } from '@components/project/Contexts';
    import Evaluate from '@nodes/Evaluate';
    import Flow from '@components/editor/blocks/Flow.svelte';
    import NodeSequenceView from '@components/editor/nodes/NodeSequenceView.svelte';
    import NodeView, { type Format } from '@components/editor/nodes/NodeView.svelte';
    import { isVerticalList } from '@components/editor/nodes/verticalLayout';

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

    let vertical = $derived(
        format.block && isVerticalList(node.inputs, format.spaces),
    );
</script>

{#if format.block}
    {#if vertical}
        <Flow direction="column">
            <Flow direction="row">
                <NodeView node={[node, 'fun']} {format} />
                <NodeView node={[node, 'types']} {format} empty="hide" />
                <NodeView node={[node, 'open']} {format} />
            </Flow>
            <Flow direction="row" indent>
                <NodeSequenceView
                    {node}
                    {format}
                    field="inputs"
                    empty={fun !== undefined && fun.inputs.length > 0
                        ? 'label'
                        : 'hide'}
                    direction="block"
                    wrap={false}
                    breaks={false}
                />
            </Flow>
            <NodeView node={[node, 'close']} {format} />
        </Flow>
    {:else}
        <NodeView node={[node, 'fun']} {format} />
        <NodeView node={[node, 'types']} {format} empty="hide" />
        <NodeView node={[node, 'open']} {format} />
        <NodeSequenceView
            {node}
            {format}
            field="inputs"
            empty={fun !== undefined && fun.inputs.length > 0
                ? 'label'
                : 'hide'}
            direction="inline"
            wrap
            breaks
        />
        <NodeView node={[node, 'close']} {format} />
    {/if}
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
