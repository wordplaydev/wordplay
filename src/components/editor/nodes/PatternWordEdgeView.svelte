<script lang="ts">
    import type PatternWordEdge from '@nodes/PatternWordEdge';
    import NodeView, {
        type Format,
    } from '@components/editor/nodes/NodeView.svelte';

    /** A locale-tagged word-edge atom (`┊/lang`) — a zero-width word boundary. */
    interface Props {
        node: PatternWordEdge;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={[node, 'edge']} {format} /><NodeView
    node={[node, 'language']}
    {format}
/>
