<script lang="ts">
    import type ConversionType from '../../nodes/ConversionType';
    import NodeView from './NodeView.svelte';

    interface Props {
        node: ConversionType;
    }

    let { node }: Props = $props();
</script>

<NodeView node={node.input} /><NodeView node={node.convert} /><NodeView
    node={node.output}
/>
