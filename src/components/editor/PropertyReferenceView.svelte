<script lang="ts">
    import type PropertyReference from '@nodes/PropertyReference';
    import NodeView from './NodeView.svelte';

    interface Props {
        node: PropertyReference;
    }

    let { node }: Props = $props();
</script>

<NodeView node={node.structure} /><NodeView node={node.dot} /><NodeView
    node={node.name}
/>
