<script lang="ts">
    import NodeView from './NodeView.svelte';
    import type ConversionType from '../../nodes/ConversionType';

    interface Props {
        node: ConversionType;
    }

    let { node }: Props = $props();
</script>

<NodeView node={node.input} /><NodeView node={node.convert} /><NodeView
    node={node.output}
/>
