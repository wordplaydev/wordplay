<script lang="ts">
    import type Reaction from '@nodes/Reaction';
    import NodeView from './NodeView.svelte';

    interface Props {
        node: Reaction;
    }

    let { node }: Props = $props();
</script>

<NodeView node={node.initial} /><NodeView node={node.dots} /><NodeView
    node={node.condition}
/><NodeView node={node.nextdots} /><NodeView node={node.next} />
