<svelte:options immutable={true} />

<script lang="ts">
    import type FunctionValue from '@runtime/FunctionValue';
    import SymbolView from './SymbolView.svelte';
    import { FUNCTION_SYMBOL } from '../../parser/Symbols';
    import TokenType from '@nodes/TokenType';
    import { preferredLanguages } from '@translation/translations';

    export let value: FunctionValue;
</script>

<SymbolView symbol={FUNCTION_SYMBOL} type={TokenType.FUNCTION} />
<SymbolView
    symbol={value.definition.names.getTranslation($preferredLanguages)}
    type={TokenType.NAME}
/>
