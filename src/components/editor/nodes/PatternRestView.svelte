<script lang="ts">
    import type PatternRest from '@nodes/PatternRest';
    import NodeView, {
        type Format,
    } from '@components/editor/nodes/NodeView.svelte';

    /** The rest atom (`…`) — match any number of graphemes. */
    interface Props {
        node: PatternRest;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={[node, 'rest']} {format} />
