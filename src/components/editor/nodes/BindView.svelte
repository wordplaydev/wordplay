<script lang="ts">
    import AnyType from '@nodes/AnyType';
    import type Bind from '@nodes/Bind';
    import Flow from '@components/editor/blocks/Flow.svelte';
    import NodeView, {
        type Format,
    } from '@components/editor/nodes/NodeView.svelte';
    import { isFoldableNode } from '@components/editor/util/folding';
    import FoldToggle from '@components/editor/util/FoldToggle.svelte';
    import FoldEllipsis from '@components/editor/util/FoldEllipsis.svelte';

    interface Props {
        node: Bind;
        format: Format;
        folded?: boolean;
    }

    let { node, format, folded = false }: Props = $props();

    let foldable = $derived(
        format.editable && isFoldableNode(node, format.spaces),
    );
    let headerFormat = $derived({ ...format, editable: false });
</script>

{#if folded && foldable}
    <!-- Collapsed: name (and type) + colon + …, hiding the value. The docs (if
         any) stay above/before the collapsed header and fold on their own. -->
    {#if format.block}
        {#if !node.docs.isEmpty()}<NodeView
                node={[node, 'docs']}
                {format}
                empty="menu"
            />{/if}
        <Flow direction="row"
            ><FoldToggle {node} /><NodeView
                node={[node, 'share']}
                format={headerFormat}
                empty="hide"
            /><NodeView node={[node, 'names']} format={headerFormat} /><NodeView
                node={[node, 'etc']}
                format={headerFormat}
                empty="hide"
            />{#if !(node.type instanceof AnyType)}<NodeView
                    node={[node, 'dot']}
                    format={headerFormat}
                    empty="hide"
                /><NodeView
                    node={[node, 'type']}
                    format={headerFormat}
                    empty="hide"
                />{/if}<NodeView
                node={[node, 'colon']}
                format={headerFormat}
            /><FoldEllipsis {node} /></Flow
        >
    {:else}{#if !node.docs.isEmpty()}<NodeView
                node={[node, 'docs']}
                {format}
            />{/if}<NodeView
            node={[node, 'names']}
            format={headerFormat}
            foldToggleFor={node}
        /><NodeView
            node={[node, 'etc']}
            format={headerFormat}
        />{#if !(node.type instanceof AnyType)}<span class="type"
                ><NodeView
                    node={[node, 'dot']}
                    format={headerFormat}
                /><NodeView node={[node, 'type']} format={headerFormat} /></span
            >{/if}<strong
            ><NodeView node={[node, 'colon']} format={headerFormat} /></strong
        ><FoldEllipsis {node} />{/if}
{:else if format.block}
    {#if !node.docs.isEmpty()}
        <NodeView node={[node, 'docs']} {format} empty="menu" />
    {/if}
    <Flow direction="row" wrap>
        <Flow direction="row">
            {#if foldable}<FoldToggle {node} />{/if}{#if node.docs.isEmpty()}
                <NodeView node={[node, 'docs']} {format} empty="menu" />
            {/if}
            <NodeView node={[node, 'share']} {format} empty="hide" />
            <NodeView node={[node, 'names']} {format} />
            <NodeView node={[node, 'etc']} {format} empty="hide" />
            {#if !(node.type instanceof AnyType)}
                <NodeView node={[node, 'dot']} {format} empty="hide" />
                <NodeView node={[node, 'type']} {format} empty="menu" />
            {/if}
            <NodeView node={[node, 'colon']} {format} empty="hide" />
        </Flow>
        <NodeView node={[node, 'value']} {format} />
    </Flow>
{:else}
    <NodeView node={[node, 'docs']} {format} /><NodeView
        node={[node, 'share']}
        {format}
    /><NodeView
        node={[node, 'names']}
        {format}
        foldToggleFor={foldable ? node : undefined}
    /><NodeView node={[node, 'etc']} {format} />{#if !(node.type instanceof AnyType)}<span
            class="type"
            ><NodeView node={[node, 'dot']} {format} /><NodeView
                node={[node, 'type']}
                {format}
            /></span
        >{/if}<strong><NodeView node={[node, 'colon']} {format} /></strong
    >{#if node.value}<NodeView node={[node, 'value']} {format} />{/if}
{/if}
