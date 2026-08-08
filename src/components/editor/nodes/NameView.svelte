<script lang="ts">
    import type Alias from '@nodes/Name';
    import NodeView, {
        type Format,
    } from '@components/editor/nodes/NodeView.svelte';

    interface Props {
        node: Alias;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<!-- A language tag is addable in blocks mode via the menu; separators stay implicit. -->
<strong><NodeView node={[node, 'name']} {format} /></strong><NodeView
    node={[node, 'language']}
    {format}
    empty={format.block ? 'menu' : 'hide'}
/><NodeView node={[node, 'separator']} {format} empty="hide" />
