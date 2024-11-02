<script lang="ts">
    import type Initial from '../../nodes/Initial';
    import NodeView from './NodeView.svelte';

    interface Props {
        node: Initial;
    }

    let { node }: Props = $props();
</script>

<NodeView node={node.diamond} />
