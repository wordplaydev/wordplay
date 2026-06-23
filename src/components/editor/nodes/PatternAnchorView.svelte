<script lang="ts">
    import type PatternAnchor from '@nodes/PatternAnchor';
    import NodeView, {
        type Format,
    } from '@components/editor/nodes/NodeView.svelte';

    /** A pattern start/end anchor (`⊢`/`⊣`) — a single glyph token. */
    interface Props {
        node: PatternAnchor;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={[node, 'anchor']} {format} />
