<script lang="ts">
    import { getLanguages } from "../editor/util/Contexts";
    import PhraseType, { Phrase } from "../native/Phrase";
    import TokenType from "../nodes/TokenType";
    import { BIND_SYMBOL, EVAL_CLOSE_SYMBOL, EVAL_OPEN_SYMBOL } from "../parser/Tokenizer";
    import None from "../runtime/None";
    import type Structure from "../runtime/Structure";
    import PhraseView from "./PhraseView.svelte";
    import SymbolView from "./SymbolView.svelte";
    import ValueView from "./ValueView.svelte";

    export let value: Structure;

    let languages = getLanguages();

</script>

{#if value.type === PhraseType }
    <PhraseView phrase={new Phrase(value)} inline/>
{:else}
    <SymbolView symbol={value.type.names.getTranslation($languages)} type={TokenType.NAME}/><SymbolView symbol={EVAL_OPEN_SYMBOL} type={TokenType.EVAL_OPEN}/>{#each value.type.inputs as input, index}<SymbolView symbol={input.names.getTranslation($languages)} type={TokenType.NAME}/><SymbolView symbol={BIND_SYMBOL} type={TokenType.BIND}/><ValueView value={value.resolve(input.getNames()[0]) ?? new None(value.type)}/>{#if index < value.type.inputs.length - 1}&nbsp;{/if}{/each}<SymbolView symbol={EVAL_CLOSE_SYMBOL} type={TokenType.EVAL_CLOSE}/>
{/if}