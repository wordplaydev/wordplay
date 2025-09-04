<script lang="ts">
    import type FunctionType from '@nodes/FunctionType';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import NodeView from './NodeView.svelte';

    interface Props {
        node: FunctionType;
    }

    let { node }: Props = $props();
</script>

<NodeView node={node.fun} /><NodeView node={node.types} /><NodeView
    node={node.open}
/><NodeSequenceView nodes={node.inputs} /><NodeView
    node={node.close}
/><NodeView node={node.output} />
