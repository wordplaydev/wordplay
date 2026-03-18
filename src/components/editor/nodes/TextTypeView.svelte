<script lang="ts">
    import type TextType from '@nodes/TextType';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: TextType;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={[node, 'open']} {format} /><NodeView
    node={[node, 'text']}
    empty="hide"
    {format}
/><NodeView node={[node, 'close']} {format} /><NodeView
    node={[node, 'language']}
    {format}
    empty="menu"
/>
