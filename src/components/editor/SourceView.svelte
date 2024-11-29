<script lang="ts">
    import type Source from '../../nodes/Source';
    import NodeView from './NodeView.svelte';

    interface Props {
        node: Source;
    }

    let { node }: Props = $props();
</script>

<NodeView node={node.expression} />
