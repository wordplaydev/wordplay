<script lang="ts">
    import type PropertyBind from '@nodes/PropertyBind';
    import NodeView from './NodeView.svelte';

    interface Props {
        node: PropertyBind;
    }

    let { node }: Props = $props();
</script>

<NodeView node={node.reference} /><NodeView node={node.bind} /><NodeView
    node={node.value}
/>
