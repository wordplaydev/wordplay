<script lang="ts">
    import Sym from '@nodes/Sym';
    import type StreamValue from '@values/StreamValue';
    import { locales } from '../../db/Database';
    import SymbolView from './SymbolView.svelte';

    interface Props {
        value: StreamValue;
        inline?: boolean;
    }

    let { value, inline = true }: Props = $props();
</script>

{#if inline || !inline}<SymbolView
        symbol={value.getPreferredName($locales)}
        type={Sym.Name}
    />{/if}
