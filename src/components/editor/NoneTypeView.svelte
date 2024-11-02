<script lang="ts">
    import type NoneType from '@nodes/NoneType';
    import NodeView from './NodeView.svelte';

    interface Props {
        node: NoneType;
    }

    let { node }: Props = $props();
</script>

<NodeView node={node.none} />
