<script lang="ts">
    import type NameType from '@nodes/NameType';
    import NodeView, {
        type Format,
    } from '@components/editor/nodes/NodeView.svelte';

    interface Props {
        node: NameType;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<!-- The kit and its dot render first when the name is reached through one
     (`colors.Sprite`, #1373); both are absent on an ordinary name type. -->
<NodeView node={[node, 'kit']} {format} /><NodeView
    node={[node, 'dot']}
    {format}
/><NodeView node={[node, 'name']} {format} /><NodeView
    node={[node, 'types']}
    {format}
/>
