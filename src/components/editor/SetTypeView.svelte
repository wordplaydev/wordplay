<script lang="ts">
    import type SetType from '@nodes/SetType';
    import NodeView from './NodeView.svelte';

    interface Props {
        node: SetType;
    }

    let { node }: Props = $props();
</script>

<NodeView node={node.open} /><NodeView node={node.key} /><NodeView
    node={node.close}
/>
