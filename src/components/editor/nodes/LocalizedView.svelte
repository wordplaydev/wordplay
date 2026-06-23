<script lang="ts">
    import type Localized from '@nodes/Localized';
    import NodeView, {
        type Format,
    } from '@components/editor/nodes/NodeView.svelte';

    interface Props {
        node: Localized;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={[node, 'expression']} {format} /><NodeView
    node={[node, 'language']}
    {format}
/>
