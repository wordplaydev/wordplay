<script lang="ts">
    import type This from '@nodes/This';
    import NodeView, { type Format } from '@components/editor/nodes/NodeView.svelte';

    interface Props {
        node: This;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={[node, 'dis']} {format} />
