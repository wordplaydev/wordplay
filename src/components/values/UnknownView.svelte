<svelte:options immutable={true} />

<script lang="ts">
    import type Value from '@values/Value';

    export let value: Value;
</script>

<span>{value.constructor.name}</span>

<style>
    span {
        background-color: var(--wordplay-error);
    }
</style>
