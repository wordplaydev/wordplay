<script lang="ts">
    import type This from '@nodes/This';
    import NodeView from './NodeView.svelte';

    interface Props {
        node: This;
    }

    let { node }: Props = $props();
</script>

<NodeView node={node.dis} />
