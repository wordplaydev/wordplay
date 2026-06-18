<script lang="ts">
    import type PatternComplement from '@nodes/PatternComplement';
    import NodeView, {
        type Format,
    } from '@components/editor/nodes/NodeView.svelte';

    /** A negated atom (`~atom`) — match a grapheme the atom does not. */
    interface Props {
        node: PatternComplement;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={[node, 'not']} {format} /><NodeView
    node={[node, 'atom']}
    {format}
/>
