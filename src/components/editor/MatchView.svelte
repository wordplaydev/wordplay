<script lang="ts">
    import type Match from '@nodes/Match';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import NodeView from './NodeView.svelte';

    interface Props {
        node: Match;
    }

    let { node }: Props = $props();
</script>

<NodeView node={node.value} /><NodeView node={node.question} /><NodeSequenceView
    nodes={node.cases}
/><NodeView node={node.other} />
