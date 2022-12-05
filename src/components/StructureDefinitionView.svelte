<script lang="ts">
    import type StructureDefinitionValue from "../runtime/StructureDefinitionValue";
    import { getLanguages } from "../editor/util/Contexts";
    import SymbolView from "./SymbolView.svelte";
    import { TYPE_SYMBOL } from "../parser/Tokenizer";
    import TokenType from "../nodes/TokenType";

    export let value: StructureDefinitionValue;

    let languages = getLanguages();

</script>

<SymbolView symbol={TYPE_SYMBOL} type={TokenType.TYPE}/><SymbolView symbol={value.definition.names.getTranslation($languages)} type={TokenType.NAME}/>