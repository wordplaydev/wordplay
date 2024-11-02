<script lang="ts">
    import type TypeInputs from '@nodes/TypeInputs';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import NodeView from './NodeView.svelte';

    interface Props {
        node: TypeInputs;
    }

    let { node }: Props = $props();
</script>

<NodeView node={node.open} /><NodeSequenceView nodes={node.types} /><NodeView
    node={node.close}
/>
