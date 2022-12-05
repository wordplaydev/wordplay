<script lang="ts">
    import type FunctionValue from "../runtime/FunctionValue";
    import { getLanguages } from "../editor/util/Contexts";
    import SymbolView from "./SymbolView.svelte";
    import { FUNCTION_SYMBOL } from "../parser/Tokenizer";
    import TokenType from "../nodes/TokenType";

    export let value: FunctionValue;
    let languages = getLanguages();

</script>

<SymbolView symbol={FUNCTION_SYMBOL} type={TokenType.FUNCTION}/> <SymbolView symbol={value.definition.names.getTranslation($languages)} type={TokenType.NAME}/>