<script lang="ts">
    import type SetLiteral from '@nodes/SetLiteral';
    import Flow from '@components/editor/blocks/Flow.svelte';
    import NodeSequenceView from '@components/editor/nodes/NodeSequenceView.svelte';
    import NodeView, {
        type Format,
    } from '@components/editor/nodes/NodeView.svelte';
    import { isVerticalList } from '@components/editor/nodes/verticalLayout';
    import { isFoldableNode } from '@components/editor/util/folding';
    import FoldToggle from '@components/editor/util/FoldToggle.svelte';
    import FoldEllipsis from '@components/editor/util/FoldEllipsis.svelte';
    import CollapsedHeader from '@components/editor/util/CollapsedHeader.svelte';

    interface Props {
        node: SetLiteral;
        format: Format;
        folded?: boolean;
    }

    let { node, format, folded = false }: Props = $props();

    let vertical = $derived(
        format.block && isVerticalList(node.values, format.spaces),
    );

    // Foldable when multi-line or when it holds many items (so long
    // single-line collections collapse too — replacing the old "show
    // more" elision).
    let foldable = $derived(
        format.editable && isFoldableNode(node, format.spaces),
    );
    let headerFormat = $derived({ ...format, editable: false });
</script>

{#if folded && foldable}
    <!-- Collapsed: { … }, hiding the values. -->
    <CollapsedHeader block={format.block}>
        {#snippet header()}<FoldToggle {node} /><NodeView
                node={[node, 'open']}
                format={headerFormat}
            /><FoldEllipsis {node} count={node.values.length} /><NodeView
                node={[node, 'close']}
                format={headerFormat}
                noSpace
            /><NodeView
                node={[node, 'literal']}
                format={headerFormat}
            />{/snippet}
    </CollapsedHeader>
{:else if format.block}
    {#if vertical}
        <Flow direction="column">
            <Flow direction="row"
                >{#if foldable}<FoldToggle {node} />{/if}<NodeView
                    node={[node, 'open']}
                    {format}
                /></Flow
            >
            <Flow direction="row" indent>
                <NodeSequenceView
                    {node}
                    field="values"
                    {format}
                    empty="label"
                    direction="block"
                    wrap={false}
                    breaks
                />
            </Flow>
            <Flow direction="row">
                <NodeView node={[node, 'close']} {format} />
                <NodeView node={[node, 'literal']} {format} />
            </Flow>
        </Flow>
    {:else}
        {#if foldable}<FoldToggle {node} />{/if}<NodeView
            node={[node, 'open']}
            {format}
        />
        <NodeSequenceView
            {node}
            field="values"
            {format}
            empty="label"
            direction="inline"
            wrap
            breaks
        />
        <NodeView node={[node, 'close']} {format} />
        <NodeView node={[node, 'literal']} {format} />
    {/if}
{:else}
    {#if foldable}<FoldToggle {node} />{/if}<NodeView
        node={[node, 'open']}
        {format}
    /><NodeSequenceView
        {node}
        field="values"
        {format}
        empty="label"
    /><NodeView node={[node, 'close']} {format} /><NodeView
        node={[node, 'literal']}
        {format}
    />
{/if}
