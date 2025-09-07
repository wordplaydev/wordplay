<script lang="ts">
    import type UnaryEvaluate from '@nodes/UnaryEvaluate';
    import NodeView from './NodeView.svelte';

    interface Props {
        node: UnaryEvaluate;
    }

    let { node }: Props = $props();
</script>

<NodeView node={node.fun} /><NodeView node={node.input} />
