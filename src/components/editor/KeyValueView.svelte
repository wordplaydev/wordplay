<script lang="ts">
    import type KeyValue from '@nodes/KeyValue';
    import NodeView from './NodeView.svelte';

    interface Props {
        node: KeyValue;
    }

    let { node }: Props = $props();
</script>

<NodeView node={node.key} /><NodeView node={node.bind} /><NodeView
    node={node.value}
/>
