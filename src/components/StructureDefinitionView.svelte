<svelte:options immutable={true} />

<script lang="ts">
    import type StructureDefinitionValue from '../runtime/StructureDefinitionValue';
    import { languages } from '../models/languages';
    import SymbolView from './SymbolView.svelte';
    import { TYPE_SYMBOL } from '../parser/Tokenizer';
    import TokenType from '../nodes/TokenType';

    export let value: StructureDefinitionValue;
</script>

<SymbolView symbol={TYPE_SYMBOL} type={TokenType.TYPE} /><SymbolView
    symbol={value.definition.names.getTranslation($languages)}
    type={TokenType.NAME}
/>
