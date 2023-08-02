<svelte:options immutable={true} />

<script lang="ts">
    import NodeView from './NodeView.svelte';
    import type Translation from '../../nodes/Translation';
    import NodeSequenceView from './NodeSequenceView.svelte';

    export let node: Translation;
</script>

<NodeView node={node.open} /><NodeSequenceView nodes={node.segments} /><NodeView
    node={node.close}
/><NodeView node={node.language} />
