<svelte:options immutable={true}/>
<script lang="ts">
    import type Value from "../runtime/Value";
    import renderValue from "./valueToView";

    export let value: Value;

</script>

<span><svelte:component this={renderValue(value.constructor)} value={value} /></span>

<style>
    span {
        color: var(--wordplay-executing-color);
    }
</style>