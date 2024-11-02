<script lang="ts">
    import SymbolView from './SymbolView.svelte';
    import Sym from '@nodes/Sym';
    import type StreamDefinitionValue from '../../values/StreamDefinitionValue';
    import { STREAM_SYMBOL } from '../../parser/Symbols';
    import { locales } from '../../db/Database';

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
