<script lang="ts">
    import type Program from '@nodes/Program';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import NodeView from './NodeView.svelte';

    interface Props {
        node: Program;
    }

    let { node }: Props = $props();
</script>

<NodeView node={node.docs} /><NodeSequenceView nodes={node.borrows} /><NodeView
    node={node.expression}
/><NodeView node={node.end} />
