<script lang="ts">
    import type PatternRange from '@nodes/PatternRange';
    import NodeView, {
        type Format,
    } from '@components/editor/nodes/NodeView.svelte';

    /** A scalar range (`"a"–"z"`) inside a set, matching graphemes between the
     *  two endpoints. */
    interface Props {
        node: PatternRange;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={[node, 'low']} {format} /><NodeView
    node={[node, 'dash']}
    {format}
/><NodeView node={[node, 'high']} {format} />
