<script lang="ts">
    import type MarkupValue from '@values/MarkupValue';
    import SymbolView from './SymbolView.svelte';
    import Sym from '@nodes/Sym';

    interface Props {
        value: MarkupValue;
        inline?: boolean;
    }

    let { value, inline = true }: Props = $props();
</script>

<SymbolView symbol={value.markup.toWordplay()} type={Sym.Words} />
