<script lang="ts">
    import { locales } from '@db/Database';
    import Sym from '@nodes/Sym';
    import { FUNCTION_SYMBOL } from '@parser/Symbols';
    import type FunctionValue from '@values/FunctionValue';
    import SymbolView from './SymbolView.svelte';

    interface Props {
        value: FunctionValue;
        inline?: boolean;
    }

    let { value, inline = true }: Props = $props();
</script>

{#if inline || !inline}
    <SymbolView symbol={FUNCTION_SYMBOL} type={Sym.Function} />
    <SymbolView
        symbol={$locales.getName(value.definition.names)}
        type={Sym.Name}
    />
{/if}
