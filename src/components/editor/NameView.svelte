<svelte:options immutable={true} />

<script lang="ts">
    import type Alias from '@nodes/Name';
    import NodeView from './NodeView.svelte';

    export let node: Alias;
</script>

<strong><NodeView node={node.name} /></strong><NodeView
    node={node.language}
/><NodeView node={node.separator} />
