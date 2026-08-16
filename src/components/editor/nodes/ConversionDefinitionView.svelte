<script lang="ts">
    import type ConversionDefinition from '@nodes/ConversionDefinition';
    import NodeView, {
        type Format,
    } from '@components/editor/nodes/NodeView.svelte';

    interface Props {
        node: ConversionDefinition;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<!-- Docs are addable in blocks mode, matching every other documentable definition. -->
<NodeView
    node={[node, 'docs']}
    {format}
    empty={format.block ? 'menu' : 'hide'}
/><NodeView node={[node, 'arrow']} {format} /><NodeView
    node={[node, 'input']}
    {format}
/><NodeView node={[node, 'output']} {format} /><NodeView
    node={[node, 'expression']}
    {format}
/>
