<script lang="ts">
    import { LIST_CLOSE_SYMBOL, LIST_OPEN_SYMBOL } from "../parser/Tokenizer";
import type List from "../runtime/List";
    import ValueView from "./ValueView.svelte";

    export let value: List;

</script>

{LIST_OPEN_SYMBOL}{#each value.values as val}&nbsp;<ValueView value={val}/>{/each}&nbsp;{LIST_CLOSE_SYMBOL}