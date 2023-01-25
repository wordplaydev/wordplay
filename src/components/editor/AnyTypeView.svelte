<svelte:options immutable={true} />

<script lang="ts">
    import type AnyType from '@nodes/AnyType';

    export let node: AnyType;
</script>

<span>{node.toWordplay()}</span>
