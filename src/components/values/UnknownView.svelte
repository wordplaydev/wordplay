<svelte:options immutable={true} />

<script lang="ts">
    import type Value from '@values/Value';

    export let value: Value;
    export const inline: boolean = true;
</script>

<span>{value.constructor.name}</span>

<style>
    span {
        background-color: var(--wordplay-error);
        color: var(--wordplay-background);
    }
</style>
