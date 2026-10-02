<script lang="ts">
    import { Sym } from '#nodes/Sym.ts';
    import { TYPE_SYMBOL } from '#parser/Symbols.ts';
    import type StructureDefinitionValue from '#values/StructureDefinitionValue.ts';
    import { locales } from '#db/Database.ts';
    import SymbolView from '#components/values/SymbolView.svelte';

    interface Props {
        value: StructureDefinitionValue;
        inline?: boolean;
    }

    let { value, inline = true }: Props = $props();
</script>

{#if inline || !inline}<SymbolView
        symbol={TYPE_SYMBOL}
        type={Sym.Type}
    /><SymbolView
        symbol={$locales.getName(value.definition.names)}
        type={Sym.Name}
    />{/if}
