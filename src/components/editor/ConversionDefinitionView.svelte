<script lang="ts">
    import type ConversionDefinition from '@nodes/ConversionDefinition';
    import NodeView from './NodeView.svelte';

    interface Props {
        node: ConversionDefinition;
    }

    let { node }: Props = $props();
</script>

<NodeView node={node.docs} /><NodeView node={node.arrow} /><NodeView
    node={node.input}
/><NodeView node={node.output} /><NodeView node={node.expression} />
