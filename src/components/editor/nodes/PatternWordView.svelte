<script lang="ts">
    import type PatternWord from '@nodes/PatternWord';
    import NodeView, {
        type Format,
    } from '@components/editor/nodes/NodeView.svelte';

    /** A locale-tagged word atom (`▭/lang`) matching one segmented word. */
    interface Props {
        node: PatternWord;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={[node, 'box']} {format} /><NodeView
    node={[node, 'language']}
    {format}
/>
