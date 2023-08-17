<svelte:options immutable={true} />

<script lang="ts">
    import NodeView from './NodeView.svelte';
    import type IsLocale from '@nodes/IsLocale';

    export let node: IsLocale;
</script>

<NodeView node={node.globe} /><NodeView node={node.locale} />
