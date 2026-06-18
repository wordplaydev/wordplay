<script lang="ts">
    import type PatternCapture from '@nodes/PatternCapture';
    import NodeView, {
        type Format,
    } from '@components/editor/nodes/NodeView.svelte';

    /** A named capture (`name:atom`) recording the matched span. */
    interface Props {
        node: PatternCapture;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={[node, 'name']} {format} /><NodeView
    node={[node, 'bind']}
    {format}
/><NodeView node={[node, 'atom']} {format} />
