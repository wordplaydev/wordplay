<svelte:options immutable={true} />

<script lang="ts">
    import SymbolView from './SymbolView.svelte';
    import Sym from '@nodes/Sym';
    import type StreamDefinitionValue from '../../values/StreamDefinitionValue';
    import { STREAM_SYMBOL } from '../../parser/Symbols';
    import { locales } from '../../db/Database';

    export let value: StreamDefinitionValue;
    export let inline = true;
</script>

{#if inline || !inline}<SymbolView
        symbol={STREAM_SYMBOL}
        type={Sym.Stream}
    /><SymbolView
        symbol={$locales.getName(value.definition.names)}
        type={Sym.Name}
    />{/if}
