<script lang="ts">
    import type Unit from '@nodes/Unit';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import NodeView from './NodeView.svelte';

    interface Props {
        node: Unit;
    }

    let { node }: Props = $props();
</script>

<NodeSequenceView nodes={node.numerator} /><NodeView
    node={node.slash}
/><NodeSequenceView nodes={node.denominator} />
