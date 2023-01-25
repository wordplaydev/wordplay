<svelte:options immutable={true} />

<script lang="ts">
    import TokenType from '@nodes/TokenType';
    import { CONVERT_SYMBOL } from '../../parser/Symbols';
    import type Conversion from '@runtime/Conversion';
    import SymbolView from './SymbolView.svelte';

    export let value: Conversion;
</script>

<SymbolView
    symbol={value.definition.input.toWordplay()}
    type={TokenType.TYPE}
/><SymbolView symbol={CONVERT_SYMBOL} type={TokenType.CONVERT} /><SymbolView
    symbol={value.definition.output.toWordplay()}
    type={TokenType.TYPE}
/>
