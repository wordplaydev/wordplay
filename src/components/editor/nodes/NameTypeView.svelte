<script lang="ts">
    import type NameType from '@nodes/NameType';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: NameType;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={[node, 'name']} {format} /><NodeView
    node={[node, 'types']}
    {format}
/>
