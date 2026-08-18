<script lang="ts">
    import type Doc from '@nodes/Doc';
    import NodeView, {
        type Format,
    } from '@components/editor/nodes/NodeView.svelte';
    import { isFoldableNode } from '@components/editor/util/folding';
    import FoldEllipsis from '@components/editor/util/FoldEllipsis.svelte';

    interface DocProps {
        node: Doc;
        format: Format;
        folded?: boolean;
    }

    let { node, format, folded = false }: DocProps = $props();

    // A doc folds on its own when it spans more than one line, independent of the
    // node it documents.
    let foldable = $derived(
        format.editable && isFoldableNode(node, format.spaces),
    );
    let headerFormat = $derived({ ...format, editable: false });
</script>

<!-- Collapsed: just the delimiters with a "…" for the markup. noSpace on the
     closer keeps the hidden body's newlines from dragging it onto another line,
     so it reads as a clean "¶…¶". No whitespace between views: this renders
     inline in text mode, where every space is a Space view, not markup. -->
{#if folded && foldable}<NodeView
        node={[node, 'open']}
        format={headerFormat}
        foldToggleFor={node}
    /><FoldEllipsis {node} /><NodeView
        node={[node, 'close']}
        format={headerFormat}
        noSpace
        empty="hide"
    /><NodeView
        node={[node, 'language']}
        format={headerFormat}
        empty="hide"
    /><NodeView
        node={[node, 'separator']}
        format={headerFormat}
        empty="hide"
    />{:else}<NodeView
        node={[node, 'open']}
        {format}
        foldToggleFor={foldable ? node : undefined}
    /><NodeView node={[node, 'markup']} {format} /><NodeView
        node={[node, 'close']}
        {format}
    /><NodeView node={[node, 'language']} {format} empty="menu" /><NodeView
        node={[node, 'separator']}
        {format}
        empty="hide"
    />{/if}
