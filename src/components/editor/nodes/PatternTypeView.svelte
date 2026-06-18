<script lang="ts">
    import type PatternType from '@nodes/PatternType';
    import NodeView, {
        type Format,
    } from '@components/editor/nodes/NodeView.svelte';

    /** The pattern type `•⣿⣿`. */
    interface Props {
        node: PatternType;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={[node, 'open']} {format} /><NodeView
    node={[node, 'close']}
    {format}
/>
