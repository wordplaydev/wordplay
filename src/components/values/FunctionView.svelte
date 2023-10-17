<svelte:options immutable={true} />

<script lang="ts">
    import type FunctionValue from '@values/FunctionValue';
    import SymbolView from './SymbolView.svelte';
    import { FUNCTION_SYMBOL } from '@parser/Symbols';
    import Sym from '@nodes/Sym';
    import { locales } from '@db/Database';

    export let value: FunctionValue;
    export let inline = true;
</script>

{#if inline || !inline}
    <SymbolView symbol={FUNCTION_SYMBOL} type={Sym.Function} />
    <SymbolView
        symbol={$locales.getName(value.definition.names)}
        type={Sym.Name}
    />
{/if}
