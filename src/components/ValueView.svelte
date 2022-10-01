<script lang="ts">
    import type Value from "../runtime/Value";
    import renderValue from "./renderValue";

    export let value: Value;

</script>

<svelte:component this={renderValue(value.constructor)} value={value} />