<svelte:options immutable={true} />

<script lang="ts">
    import type Node from '@nodes/Node';

    export let node: Node;
</script>

<span class="name">{node.getDescriptor()}</span>

<style>
    .name {
        background-color: var(--wordplay-error);
    }
</style>
