<script lang="ts">
    import { Sym } from '#nodes/Sym.ts';
    import type StreamValue from '#values/StreamValue.ts';
    import { locales } from '#db/Database.ts';
    import SymbolView from '#components/values/SymbolView.svelte';

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
