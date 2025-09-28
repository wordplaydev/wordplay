<script lang="ts">
    import type ConversionType from '../../../nodes/ConversionType';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: ConversionType;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={[node, 'input']} {format} /><NodeView
    node={[node, 'convert']}
    {format}
/><NodeView node={[node, 'output']} {format} />
