<script lang="ts">
    import { BIND_SYMBOL, SET_CLOSE_SYMBOL, SET_OPEN_SYMBOL } from "../parser/Tokenizer";
    import type MapValue from "../runtime/MapValue";
    import ValueView from "./ValueView.svelte";

    export let value: MapValue;

</script>

{SET_OPEN_SYMBOL}{#each value.values as [ key, val ]}<ValueView value={key}/>{BIND_SYMBOL}<ValueView value={val}/>{/each}{SET_CLOSE_SYMBOL}