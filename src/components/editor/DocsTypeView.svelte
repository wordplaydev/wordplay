<svelte:options immutable={true} />

<script lang="ts">
    import NodeView from './NodeView.svelte';
    import type DocsType from '../../nodes/DocsType';

    export let node: DocsType;
</script>

<NodeView node={node.open} /><NodeView node={node.close} />
