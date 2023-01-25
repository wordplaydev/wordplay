<svelte:options immutable={true} />

<script lang="ts">
    import type Value from '@runtime/Value';
    import renderValue from './valueToView';

    export let value: Value;
</script>

<span class="value" data-id={value.id}
    ><svelte:component this={renderValue(value.constructor)} {value} /></span
>

<style>
    span {
        color: var(--wordplay-evaluation-color);
    }
</style>
