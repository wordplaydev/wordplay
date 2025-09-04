<script lang="ts">
    import type TypeVariables from '@nodes/TypeVariables';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import NodeView from './NodeView.svelte';

    interface Props {
        node: TypeVariables;
    }

    let { node }: Props = $props();
</script>

<NodeView node={node.open} /><NodeSequenceView
    nodes={node.variables}
/><NodeView node={node.close} />
