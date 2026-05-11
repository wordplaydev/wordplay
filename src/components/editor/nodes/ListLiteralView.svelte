<script lang="ts">
    import type ListLiteral from '@nodes/ListLiteral';
    import Flow from '@components/editor/blocks/Flow.svelte';
    import NodeSequenceView from '@components/editor/nodes/NodeSequenceView.svelte';
    import NodeView, { type Format } from '@components/editor/nodes/NodeView.svelte';
    import { isVerticalList } from '@components/editor/nodes/verticalLayout';

    interface Props {
        node: ListLiteral;
        format: Format;
    }

    let { node, format }: Props = $props();

    let vertical = $derived(
        format.block && isVerticalList(node.values, format.spaces),
    );
</script>

{#if format.block}
    {#if vertical}
        <Flow direction="column">
            <NodeView node={[node, 'open']} {format} />
            <Flow direction="row" indent>
                <NodeSequenceView
                    {node}
                    field="values"
                    {format}
                    elide
                    empty="label"
                    direction="block"
                    wrap={false}
                    breaks
                />
            </Flow>
            <NodeView node={[node, 'close']} {format} />
            <!-- Too advanced of a feature. Let's hide it for now. -->
            <NodeView node={[node, 'literal']} {format} empty="hide" />
        </Flow>
    {:else}
        <NodeView node={[node, 'open']} {format} />
        <NodeSequenceView
            {node}
            field="values"
            {format}
            elide
            empty="label"
            direction="inline"
            wrap
            breaks
        />
        <NodeView node={[node, 'close']} {format} />
        <!-- Too advanced of a feature. Let's hide it for now. -->
        <NodeView node={[node, 'literal']} {format} empty="hide" />
    {/if}
{:else}
    <NodeView node={[node, 'open']} {format} /><NodeSequenceView
        {node}
        field="values"
        {format}
        elide
        empty="label"
    /><NodeView node={[node, 'close']} {format} /><NodeView
        node={[node, 'literal']}
        {format}
    />
{/if}
