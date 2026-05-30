<script lang="ts">
    import { Sym } from '@nodes/Sym';
    import { SET_CLOSE_SYMBOL, SET_OPEN_SYMBOL } from '@parser/Symbols';
    import type SetValue from '@values/SetValue';
    import Expandable from '@components/values/Expandable.svelte';
    import { fitCount } from '@components/values/fit';
    import SymbolView from '@components/values/SymbolView.svelte';
    import ValueView from '@components/values/ValueView.svelte';

    interface Props {
        value: SetValue;
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
    symbol={SET_OPEN_SYMBOL}
    type={Sym.SetOpen}
/><Expandable count={value.values.length} {start}
    >{#snippet content(limit)}{#each value.values.slice(0, limit) as item, index}<ValueView
                value={item}
                {inline}
            />{#if index < value.values.length - 1}{' '}{/if}{/each}{/snippet}</Expandable
><SymbolView symbol={SET_CLOSE_SYMBOL} type={Sym.SetClose} />
