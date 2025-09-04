<script lang="ts">
    import type BooleanType from '@nodes/BooleanType';
    import NodeView from './NodeView.svelte';

    interface Props {
        node: BooleanType;
    }

    let { node }: Props = $props();
</script>

<NodeView node={node.type} />
