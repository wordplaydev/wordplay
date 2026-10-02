<script lang="ts">
    import { Sym } from '#nodes/Sym.ts';
    import { locales } from '#db/Database.ts';
    import { STREAM_SYMBOL } from '#parser/Symbols.ts';
    import type StreamDefinitionValue from '#values/StreamDefinitionValue.ts';
    import SymbolView from '#components/values/SymbolView.svelte';

    interface Props {
        value: StreamDefinitionValue;
        inline?: boolean;
    }

    let { value, inline = true }: Props = $props();
</script>

{#if inline || !inline}<SymbolView
        symbol={STREAM_SYMBOL}
        type={Sym.Stream}
    /><SymbolView
        symbol={$locales.getName(value.definition.names)}
        type={Sym.Name}
    />{/if}
