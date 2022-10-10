<script lang="ts">
    import { SET_CLOSE_SYMBOL, SET_OPEN_SYMBOL } from "../parser/Tokenizer";
    import type Set from "../runtime/Set";
    import ValueView from "./ValueView.svelte";

    export let value: Set;

</script>

{SET_OPEN_SYMBOL}{#each value.values as val}<ValueView value={val}/>{/each}{SET_CLOSE_SYMBOL}