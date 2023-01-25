<svelte:options immutable={true} />

<script lang="ts">
    import type Value from '@runtime/Value';

    export let value: Value;
</script>

<span>{value.constructor.name}</span>

<style>
    span {
        background-color: var(--wordplay-error);
    }
</style>
