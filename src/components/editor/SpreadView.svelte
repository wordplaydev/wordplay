<script lang="ts">
    import type Spread from '../../nodes/Spread';
    import NodeView from './NodeView.svelte';

    interface Props {
        node: Spread;
    }

    let { node }: Props = $props();
</script>

<NodeView node={node.dots} /><NodeView node={node.list} />
