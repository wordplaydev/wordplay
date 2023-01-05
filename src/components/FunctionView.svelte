<svelte:options immutable={true} />

<script lang="ts">
    import type FunctionValue from '../runtime/FunctionValue';
    import { getLanguages } from '../translations/translations';
    import SymbolView from './SymbolView.svelte';
    import { FUNCTION_SYMBOL } from '../parser/Symbols';
    import TokenType from '../nodes/TokenType';

    export let value: FunctionValue;
</script>

<SymbolView symbol={FUNCTION_SYMBOL} type={TokenType.FUNCTION} />
<SymbolView
    symbol={value.definition.names.getTranslation(getLanguages())}
    type={TokenType.NAME}
/>
