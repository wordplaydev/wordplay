<script lang="ts">
    import type Previous from '@nodes/Previous';
    import NodeView from './NodeView.svelte';

    interface Props {
        node: Previous;
    }

    let { node }: Props = $props();
</script>

<NodeView node={node.previous} /><NodeView node={node.range} /><NodeView
    node={node.number}
/><NodeView node={node.stream} />
