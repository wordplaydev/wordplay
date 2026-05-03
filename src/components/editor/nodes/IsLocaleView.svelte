<script lang="ts">
    import type IsLocale from '@nodes/IsLocale';
    import NodeView, { type Format } from '@components/editor/nodes/NodeView.svelte';

    interface Props {
        node: IsLocale;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={[node, 'globe']} {format} /><NodeView
    node={[node, 'locale']}
    {format}
/>
