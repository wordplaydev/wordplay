<script lang="ts">
    import { locales } from '#db/Database.ts';
    import { Sym } from '#nodes/Sym.ts';
    import { FUNCTION_SYMBOL } from '#parser/Symbols.ts';
    import type FunctionValue from '#values/FunctionValue.ts';
    import SymbolView from '#components/values/SymbolView.svelte';

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
