<svelte:options immutable={true} />

<script lang="ts">
    import type Value from '@values/Value';

    export let value: Value;
    export let inline = true;
</script>

{#if inline || !inline}<span>{value.constructor.name}</span>{/if}

<style>
    span {
        background-color: var(--wordplay-error);
        color: var(--wordplay-background);
    }
</style>
