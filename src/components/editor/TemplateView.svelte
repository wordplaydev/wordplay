<svelte:options immutable={true} />

<script lang="ts">
    import type Template from '@nodes/Template';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import NodeView from './NodeView.svelte';

    export let node: Template;
</script>

<NodeView node={node.open} /><NodeSequenceView
    nodes={node.expressions}
/><NodeView node={node.language} />
