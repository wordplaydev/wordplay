<script lang="ts">
    import { BIND_SYMBOL, SET_CLOSE_SYMBOL, SET_OPEN_SYMBOL } from "../parser/Tokenizer";
    import type Map from "../runtime/Map";
    import ValueView from "./ValueView.svelte";

    export let value: Map;

</script>

{SET_OPEN_SYMBOL}{#each value.values as [ key, val ]}<ValueView value={key}/>{BIND_SYMBOL}<ValueView value={val}/>{/each}{SET_CLOSE_SYMBOL}