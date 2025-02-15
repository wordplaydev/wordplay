<script lang="ts">
    import Sym from '@nodes/Sym';
    import { locales } from '../../db/Database';
    import { STREAM_SYMBOL } from '../../parser/Symbols';
    import type StreamDefinitionValue from '../../values/StreamDefinitionValue';
    import SymbolView from './SymbolView.svelte';

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
