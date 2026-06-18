<script lang="ts">
    import type PatternQuantified from '@nodes/PatternQuantified';
    import NodeView, {
        type Format,
    } from '@components/editor/nodes/NodeView.svelte';

    /** An atom repeated by a leading quantifier (e.g. `3 #`). */
    interface Props {
        node: PatternQuantified;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={[node, 'quantifier']} {format} /><NodeView
    node={[node, 'atom']}
    {format}
/>
