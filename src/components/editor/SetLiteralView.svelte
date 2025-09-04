<script lang="ts">
    import type SetLiteral from '@nodes/SetLiteral';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import NodeView from './NodeView.svelte';

    interface Props {
        node: SetLiteral;
    }

    let { node }: Props = $props();
</script>

<NodeView node={node.open} /><NodeSequenceView
    nodes={node.values}
    elide
/><NodeView node={node.close} /><NodeView node={node.literal} />
