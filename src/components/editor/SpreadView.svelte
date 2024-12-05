<script lang="ts">
    import NodeView from './NodeView.svelte';
    import type Spread from '../../nodes/Spread';

    interface Props {
        node: Spread;
    }

    let { node }: Props = $props();
</script>

<NodeView node={node.dots} /><NodeView node={node.list} />
