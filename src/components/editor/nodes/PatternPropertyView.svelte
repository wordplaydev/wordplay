<script lang="ts">
    import type PatternProperty from '@nodes/PatternProperty';
    import NodeView, {
        type Format,
    } from '@components/editor/nodes/NodeView.svelte';

    /** A Unicode property refinement (`/name` or `/name=value`). */
    interface Props {
        node: PatternProperty;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={[node, 'slash']} {format} /><NodeView
    node={[node, 'name']}
    {format}
/><NodeView node={[node, 'equal']} {format} empty="hide" /><NodeView
    node={[node, 'value']}
    {format}
    empty="hide"
/>
