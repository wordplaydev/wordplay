<svelte:options immutable={true} />

<script lang="ts">
    import SymbolView from './SymbolView.svelte';
    import Sym from '@nodes/Symbol';
    import type StreamDefinitionValue from '../../values/StreamDefinitionValue';
    import { STREAM_SYMBOL } from '../../parser/Symbols';
    import { config } from '../../db/Database';

    export let value: StreamDefinitionValue;
    export let inline = true;
</script>

{#if inline || !inline}<SymbolView
        symbol={STREAM_SYMBOL}
        type={Sym.Stream}
    /><SymbolView
        symbol={value.definition.names.getPreferredNameString(
            $config.getLocales()
        )}
        type={Sym.Name}
    />{/if}
