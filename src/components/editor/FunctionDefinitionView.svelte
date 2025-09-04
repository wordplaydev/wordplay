<script lang="ts">
    import type FunctionDefinition from '@nodes/FunctionDefinition';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import NodeView from './NodeView.svelte';

    interface Props {
        node: FunctionDefinition;
    }

    let { node }: Props = $props();
</script>

<NodeView node={node.docs} /><NodeView node={node.share} /><NodeView
    node={node.fun}
/><NodeView node={node.names} /><NodeView node={node.types} /><NodeView
    node={node.open}
/><NodeSequenceView nodes={node.inputs} /><NodeView
    node={node.close}
/><NodeView node={node.dot} /><NodeView node={node.output} /><NodeView
    node={node.expression}
/>
