<script lang="ts">
    import Expandable from '@components/values/Expandable.svelte';
    import { fitCount } from '@components/values/fit';
    import SymbolView from '@components/values/SymbolView.svelte';
    import ValueView from '@components/values/ValueView.svelte';
    import { Sym } from '@nodes/Sym';
    import { LIST_CLOSE_SYMBOL, LIST_OPEN_SYMBOL } from '@parser/Symbols';
    import type ListValue from '@values/ListValue';

    interface Props {
        value: ListValue;
        inline?: boolean;
    }

    let { value, inline = true }: Props = $props();

    let start = $derived(
        fitCount(
            (i) => value.values[i].toWordplay().length,
            value.values.length,
        ),
    );
</script>

<SymbolView
    symbol={LIST_OPEN_SYMBOL}
    type={Sym.ListOpen}
/><Expandable count={value.values.length} {start}
    >{#snippet content(limit)}{#each value.values.slice(0, limit) as item, index}<ValueView
                value={item}
                {inline}
            />{#if index < value.values.length - 1}{' '}{/if}{/each}{/snippet}</Expandable
><SymbolView symbol={LIST_CLOSE_SYMBOL} type={Sym.ListClose} />
