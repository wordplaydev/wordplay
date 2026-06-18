<script lang="ts">
    import type PatternQuantifier from '@nodes/PatternQuantifier';
    import NodeView, {
        type Format,
    } from '@components/editor/nodes/NodeView.svelte';

    /** A possessive repetition count (`N`, `=N`, `N–M`, `≤K`, `>K`, …). */
    interface Props {
        node: PatternQuantifier;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={[node, 'relation']} {format} empty="hide" /><NodeView
    node={[node, 'low']}
    {format}
/><NodeView node={[node, 'dash']} {format} empty="hide" /><NodeView
    node={[node, 'high']}
    {format}
    empty="hide"
/>
