<script lang="ts">
    import type List from "../runtime/List";
    import { LIST_CLOSE_SYMBOL, LIST_OPEN_SYMBOL } from "../parser/Tokenizer";
    import SymbolView from "./SymbolView.svelte";
    import ValueView from "./ValueView.svelte";
    import TokenType from "../nodes/TokenType";

    export let value: List;

</script>

<SymbolView symbol={LIST_OPEN_SYMBOL} type={TokenType.LIST_OPEN}/>{#each value.values as item, index}<ValueView value={item}/>{#if index < value.values.length - 1}&nbsp;{/if}{/each}<SymbolView symbol={LIST_CLOSE_SYMBOL} type={TokenType.LIST_CLOSE}/>