<script lang="ts">
    import type ConversionDefinition from '@nodes/ConversionDefinition';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: ConversionDefinition;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={[node, 'docs']} {format} empty="hide" /><NodeView
    node={[node, 'arrow']}
    {format}
/><NodeView node={[node, 'input']} {format} /><NodeView
    node={[node, 'output']}
    {format}
/><NodeView node={[node, 'expression']} {format} />
